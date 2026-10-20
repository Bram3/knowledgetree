import { getDb, saveDb, uid, person, nodePath } from "./db";
import { isLive } from "./leaves";
import { assertItemAccess, assertNodeAccess, AccessDeniedError } from "./access";
import { canAccess } from "./auth";
import { generate, cacheKeyFor, type ModelClient } from "./gemini";
import { COMPARE_SYSTEM, COMPARE_SCHEMA, compareText, correctedNote, describeLeaf, describeNote } from "./compare-prompt";
import type { ActivityAction, Db, Leaf, LeafSource, Person } from "./types";

/**
 * COMPARE (step 5 of the pipeline) and the owner's one-tap answer to a conflict.
 *
 * At ingest every placed leaf is compared, pair by pair, with the active notes and live leaves on the same
 * node › category. Pairs keep the Gemini cache stable whatever else hangs on the node:
 * - same fact as an existing leaf → reconfirmation: the existing leaf gets a reconfirmedAt entry (×n), no new leaf;
 * - contradicts a note → the new leaf gets status "conflict" and the note's owner gets one card;
 * - anything else → a new leaf.
 * The model only judges; it never changes anything itself. An unusable answer counts as "unrelated".
 */

export type Relation = "same" | "contradicts" | "unrelated";
type Judgement = { relation: Relation; said: string | null; noted: string | null };

export type CompareOutcome = {
  fresh: Leaf[]; // leaves to store (status "conflict" when they contradict a note)
  reconfirm: { leafId: string; source: LeafSource }[]; // existing leaves heard again
};

/** Compares freshly extracted leaves with what already hangs on their node › category. Does not write. */
export async function compareLeaves(leaves: Leaf[], model?: ModelClient): Promise<CompareOutcome> {
  const out: CompareOutcome = { fresh: [], reconfirm: [] };
  const db = getDb();
  for (const leaf of leaves) {
    if (leaf.status !== "auto") {
      out.fresh.push(leaf);
      continue;
    }
    const notes = db.items.filter((i) => i.kind === "note" && i.status === "active" && i.nodeId === leaf.nodeId && i.category === leaf.category);
    const others = db.leaves.filter((l) => isLive(l) && l.status !== "seed" && l.nodeId === leaf.nodeId && l.category === leaf.category);
    const [onLeaves, onNotes] = await Promise.all([
      Promise.all(others.map((o) => judge(leaf, describeLeaf(o), model))),
      Promise.all(notes.map((n) => judge(leaf, describeNote(n), model))),
    ]);
    const same = others.find((_, i) => onLeaves[i].relation === "same");
    if (same && !out.reconfirm.some((r) => r.leafId === same.id)) {
      out.reconfirm.push({ leafId: same.id, source: leaf.source });
      continue;
    }
    const hit = notes.findIndex((_, i) => onNotes[i].relation === "contradicts");
    if (hit >= 0) {
      const note = notes[hit];
      const j = onNotes[hit];
      leaf.status = "conflict";
      leaf.conflictsWith = note.id;
      leaf.conflictClaims = { said: j.said ?? leaf.statement, noted: j.noted ?? note.title };
    }
    out.fresh.push(leaf);
  }
  return out;
}

/** Writes the side effects of a comparison (after the fresh leaves are stored): reconfirmations and the Changes feed. */
export function recordCompare(user: Person, outcome: CompareOutcome): Leaf[] {
  const reconfirmed: Leaf[] = [];
  saveDb((db) => {
    for (const r of outcome.reconfirm) {
      const l = db.leaves.find((x) => x.id === r.leafId);
      if (!l) continue;
      l.reconfirmedAt.push(r.source.at);
      (l.reconfirmedBy ??= []).push(r.source);
      log(db, "leaf_reconfirmed", l.nodeId, user.id, `heard again from ${saidBy(r.source)} (${r.source.channel}): "${l.statement}" ×${l.reconfirmedAt.length + 1}`);
      reconfirmed.push(structuredClone(l));
    }
    for (const l of outcome.fresh) {
      if (l.status !== "conflict") continue;
      const note = db.items.find((i) => i.id === l.conflictsWith);
      const owner = person(note?.ownerId);
      log(db, "leaf_conflict", l.nodeId, user.id, `caught a ${l.source.channel} from ${saidBy(l.source)} that conflicts with "${note?.title}": ${l.conflictClaims?.said} vs ${l.conflictClaims?.noted}.${owner ? ` Asked ${owner.name}.` : ""}`, note?.id, l.id);
    }
  });
  return reconfirmed;
}

/** Leaves that reconfirmed an existing leaf from this message, so re-ingesting it changes nothing. */
export function leavesReconfirmedBy(channel: LeafSource["channel"], ref: string): Leaf[] {
  return getDb().leaves.filter((l) => l.reconfirmedBy?.some((s) => s.channel === channel && s.ref === ref));
}

// ---------- the owner's card ----------

export type ConflictCard = {
  leaf: Leaf;
  note: { id: string; title: string; version: number };
  path: string[];
  companyId: string;
  text: string; // "Katrin said the 20th, your note says the 15th."
};

/**
 * Open conflict cards for `owner` (the person who owns the contradicted note), as `viewer` may see them:
 * only customers both can access. Deferred ("Not sure") and resolved conflicts have no card.
 */
export function conflictCardsFor(viewer: Person, owner: Person): ConflictCard[] {
  const db = getDb();
  const cards: ConflictCard[] = [];
  for (const leaf of db.leaves) {
    if (leaf.status !== "conflict" || leaf.deferredAt) continue;
    const note = db.items.find((i) => i.id === leaf.conflictsWith);
    if (!note || note.ownerId !== owner.id) continue;
    const n = db.nodes.find((x) => x.id === note.nodeId);
    if (!n || !canAccess(viewer, n.companyId) || !canAccess(owner, n.companyId)) continue;
    const c = leaf.conflictClaims ?? { said: leaf.statement, noted: note.title };
    cards.push({
      leaf,
      note: { id: note.id, title: note.title, version: note.versions.length },
      path: nodePath(note.nodeId).map((p) => p.name),
      companyId: n.companyId,
      text: `${firstName(leaf.source)} said ${c.said}, your note says ${c.noted}.`,
    });
  }
  return cards;
}

export type ConflictChoice = "correct" | "keep" | "unsure";
export const CONFLICT_CHOICES: readonly ConflictChoice[] = ["correct", "keep", "unsure"];

/**
 * The owner's one tap. Only the owner of the contradicted note (with access to the customer) may answer.
 * - correct: the note gets a new version with the call/mail as its source and the reason filled in; the leaf is verified.
 * - keep: the leaf falls.
 * - unsure: the conflict leaves the owner's cards and waits in the digest.
 * Answering a conflict that is already resolved changes nothing. Throws AccessDeniedError otherwise.
 */
export function resolveConflict(owner: Person, leafId: string, choice: ConflictChoice, now = new Date()): Leaf {
  const leaf = getDb().leaves.find((l) => l.id === leafId);
  if (!leaf) throw new AccessDeniedError();
  assertNodeAccess(owner, leaf.nodeId);
  const { item: note } = assertItemAccess(owner, leaf.conflictsWith ?? "");
  if (note.ownerId !== owner.id) throw new AccessDeniedError("Only the owner of the note can answer this conflict");
  if (leaf.status !== "conflict") return leaf;
  if (choice === "unsure" && leaf.deferredAt) return leaf;

  const at = now.toISOString();
  let out = leaf;
  saveDb((db) => {
    const l = db.leaves.find((x) => x.id === leafId)!;
    const it = db.items.find((i) => i.id === note.id)!;
    const c = l.conflictClaims ?? { said: l.statement, noted: it.title };
    const who = saidBy(l.source);
    if (choice === "correct") {
      const reason = `${who} said ${c.said} (${l.source.channel}, ${day(l.source.at)}): "${l.quote}"`;
      Object.assign(it, correctedNote(it, { statement: l.statement, channel: l.source.channel, saidBy: who }, c));
      it.versions.push({ version: it.versions.length + 1, byId: owner.id, at, note: reason, source: { ...l.source, leafId: l.id } });
      it.updatedAt = at;
      it.verifiedById = owner.id;
      it.verifiedAt = at;
      l.status = "verified";
      l.verifiedById = owner.id;
      log(db, "new_version", it.nodeId, owner.id, `corrected "${it.title}" to version ${it.versions.length}: ${who} said ${c.said} (${l.source.channel})`, it.id);
    } else if (choice === "keep") {
      l.status = "fallen";
      log(db, "leaf_kept", it.nodeId, owner.id, `kept "${it.title}" (${c.noted}). The ${l.source.channel} leaf from ${who} (${c.said}) fell`, it.id);
    } else {
      l.deferredAt = at;
      log(db, "leaf_deferred", it.nodeId, owner.id, `was not sure about ${c.said} vs ${c.noted} for "${it.title}". It waits in the digest`, it.id);
    }
    out = structuredClone(l);
  });
  return out;
}

// ---------- model ----------

async function judge(leaf: Leaf, existing: string, model?: ModelClient): Promise<Judgement> {
  const text = compareText({ channel: leaf.source.channel, saidBy: saidBy(leaf.source), statement: leaf.statement, quote: leaf.quote }, existing);
  const res = await generate({ system: COMPARE_SYSTEM, parts: [{ text }], schema: COMPARE_SCHEMA }, { cacheKey: cacheKeyFor("compare", text), client: model });
  return parseJudgement(res?.text);
}

function parseJudgement(json: string | undefined): Judgement {
  const none: Judgement = { relation: "unrelated", said: null, noted: null };
  if (!json) return none;
  try {
    const j = JSON.parse(json) as Record<string, unknown>;
    if (j.relation !== "same" && j.relation !== "contradicts" && j.relation !== "unrelated") return none;
    const claim = (v: unknown) => (typeof v === "string" && v.trim() && v.length <= 80 ? v.trim() : null);
    return { relation: j.relation, said: claim(j.said), noted: claim(j.noted) };
  } catch {
    return none;
  }
}


// ---------- helpers ----------

function log(db: Db, action: ActivityAction, nodeId: string, actorId: string, summary: string, itemId?: string, leafId?: string) {
  const n = db.nodes.find((x) => x.id === nodeId);
  if (!n) return;
  db.activity.push({ id: uid("a"), at: new Date().toISOString(), actorId, action, companyId: n.companyId, nodeId, itemId, ...(leafId ? { leafId } : {}), summary });
}

/** "Katrin Vogel <katrin@…>" → "Katrin Vogel"; without a sender, the person who captured it. */
function saidBy(s: LeafSource) {
  return s.from?.replace(/\s*<.*>$/, "").trim() || person(s.byId)?.name || "someone";
}

const firstName = (s: LeafSource) => saidBy(s).split(" ")[0];

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
