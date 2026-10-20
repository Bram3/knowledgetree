import { ancestors, companyCategories, companyNodes, detectNode, getDb, node, nodePath, person, saveDb, uid } from "./db";
import { assertLeafAccess } from "./access";
import { isCurrent } from "./freshness";
import { generate, cacheKeyFor, type ModelClient } from "./gemini";
import { describeLeaf } from "./compare-prompt";
import { branchOwnerId, judgeClaim } from "./compare";
import { CLAIMS_SYSTEM, claimsSchema, claimsText, draftSentences } from "./second-thought-prompt";
import { ValidationError } from "./validation";
import type { Draft } from "./demo-draft";
import type { ActivityAction, Channel, Db, Leaf, LeafSource, OrgNode, Person } from "./types";

/**
 * #19 Second thought: Leafe reads along while you write a mail. The recipient tells which customer branch the
 * mail is about; every sentence with a number in it is read for factual claims (Gemini, cached), and each claim
 * is compared (COMPARE from #8, pair by pair) with the current leaves on that branch. A contradiction gives one
 * calm card. The answer is the verification:
 * - "Change to 20th" (`confirmFromDraft`): the leaf is reconfirmed (×n+1); the client rewrites the draft.
 * - "15th is correct" (`disputeFromDraft`): a new leaf with the draft sentence as its quote, in conflict with the
 *   old one, which turns brown (in doubt); the branch owner gets one question on the existing conflict card.
 * - "Ignore": nothing is stored; the client doesn't ask again about this claim in this mail.
 */

export type SecondThought = {
  key: string; // the claim × leaf, so "Ignore" can skip it for the rest of this mail
  sentence: string; // literal sentence of the draft
  claim: string; // what the draft claims, as a standalone sentence
  said: string; // "the 15th"
  noted: string; // "the 20th"
  leafId: string;
  statement: string; // the leaf
  nodeId: string;
  category: string;
  companyId: string;
  path: string[];
  times: number; // ×n
  source: { channel: Channel; from: string; at: string };
};

export type DraftDeps = { model?: ModelClient; now?: () => Date };

export const MAX_DRAFT_CHARS = 5_000;
const MAX_TO_CHARS = 200;

/** Untrusted draft (server action body) → Draft. Throws ValidationError. */
export function validateDraft(input: unknown): Draft {
  const d = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
  if (!str(d.to, MAX_TO_CHARS)) throw new ValidationError("Bad recipient");
  if (d.subject !== undefined && !str(d.subject, MAX_TO_CHARS)) throw new ValidationError("Subject too long");
  if (!str(d.text, MAX_DRAFT_CHARS)) throw new ValidationError(`A draft is a string of at most ${MAX_DRAFT_CHARS} characters`);
  return { to: d.to as string, subject: (d.subject as string | undefined) ?? "", text: d.text as string };
}

/** The customer branch (a child of the customer root, e.g. Nike › France) the recipient and draft point at. */
function branchFor(user: Person, draft: Draft): OrgNode | null {
  const hit = detectNode(`${draft.to}\n${draft.subject}\n${draft.text}`, user.customerIds);
  if (!hit || !hit.node.parentId) return null;
  return [hit.node, ...ancestors(hit.node.id)].find((n) => node(n.parentId ?? "")?.parentId === null) ?? null;
}

function subtree(root: OrgNode): Set<string> {
  const ids = new Set([root.id]);
  for (const n of companyNodes(root.companyId)) if (ancestors(n.id).some((a) => a.id === root.id)) ids.add(n.id);
  return ids;
}

/** Second thoughts for a draft: its claims that contradict a current leaf on the recipient's branch. Never writes. */
export async function checkDraft(user: Person, draft: Draft, deps: DraftDeps = {}): Promise<SecondThought[]> {
  const branch = branchFor(user, draft);
  if (!branch) return [];
  const now = deps.now?.() ?? new Date();
  const ids = subtree(branch);
  const leaves = getDb().leaves.filter((l) => ids.has(l.nodeId) && l.status !== "seed" && l.status !== "conflict" && isCurrent(l, now));
  const sentences = draftSentences(draft.text);
  if (!leaves.length || !sentences.length) return [];

  const branchPath = nodePath(branch.id).map((n) => n.name).join(" › ");
  const categories = companyCategories(branch.companyId).map((c) => c.id);
  const perSentence = await Promise.all(sentences.map(async (sentence) => {
    const claims = await extractClaims(branchPath, sentence, categories, deps.model);
    const found: SecondThought[] = [];
    for (const claim of claims) {
      const against = leaves.filter((l) => !claim.category || l.category === claim.category);
      const verdicts = await Promise.all(against.map((l) => judgeClaim({ channel: "mail", saidBy: user.name, statement: claim.statement, quote: sentence }, describeLeaf(l), deps.model)));
      const hit = verdicts.findIndex((v) => v.relation === "contradicts");
      if (hit < 0) continue;
      const leaf = against[hit];
      found.push({
        key: `${leaf.id}:${claim.statement}`,
        sentence,
        claim: claim.statement,
        said: verdicts[hit].said ?? claim.statement,
        noted: verdicts[hit].noted ?? leaf.statement,
        leafId: leaf.id,
        statement: leaf.statement,
        nodeId: leaf.nodeId,
        category: leaf.category,
        companyId: branch.companyId,
        path: nodePath(leaf.nodeId).map((n) => n.name),
        times: leaf.reconfirmedAt.length + 1,
        source: { channel: leaf.source.channel, from: saidBy(leaf.source), at: leaf.source.at },
      });
    }
    return found;
  }));
  const thoughts = perSentence.flat();
  return thoughts.filter((t, i) => thoughts.findIndex((o) => o.leafId === t.leafId) === i);
}

type Claim = { statement: string; category: string | null };

async function extractClaims(branchPath: string, sentence: string, categories: string[], model?: ModelClient): Promise<Claim[]> {
  const text = claimsText(branchPath, sentence);
  const res = await generate({ system: CLAIMS_SYSTEM, parts: [{ text }], schema: claimsSchema(categories) }, { cacheKey: cacheKeyFor("claims", text), client: model });
  if (!res) return [];
  try {
    const list = (JSON.parse(res.text) as { claims?: unknown }).claims;
    if (!Array.isArray(list)) return [];
    return list
      .filter((c): c is Claim => !!c && typeof c.statement === "string" && c.statement.trim() !== "" && c.statement.length <= 300)
      .map((c) => ({ statement: c.statement.trim(), category: typeof c.category === "string" && categories.includes(c.category) ? c.category : null }))
      .slice(0, 2);
  } catch {
    return [];
  }
}

// ---------- the answer is the verification ----------

/** The card's content as the client sends it back, with the draft it was shown on. */
export type DraftAnswer = { leafId: string; ref: string; to: string; sentence: string; claim: string; said: string; noted: string };

const draftSource = (user: Person, a: DraftAnswer, at: string): LeafSource => ({ channel: "mail", trigger: "reaction", ref: a.ref, at, byId: user.id, from: user.name });

/** "Change to 20th": the draft now says what the leaf says, so the leaf is reconfirmed (×n+1). Once per draft. */
export function confirmFromDraft(user: Person, a: DraftAnswer, now = new Date()): Leaf {
  assertLeafAccess(user, a.leafId);
  let out!: Leaf;
  saveDb((db) => {
    const l = db.leaves.find((x) => x.id === a.leafId)!;
    if (!l.reconfirmedBy?.some((s) => s.ref === a.ref)) {
      const src = draftSource(user, a, now.toISOString());
      l.reconfirmedAt.push(src.at);
      (l.reconfirmedBy ??= []).push(src);
      log(db, "leaf_reconfirmed", l.nodeId, user.id, `changed a mail draft to ${a.to} from ${a.said} to ${a.noted}, as the leaf says: "${l.statement}" ×${l.reconfirmedAt.length + 1}`);
    }
    out = structuredClone(l);
  });
  return out;
}

/**
 * "15th is correct": a new leaf with the draft sentence as its quote, in conflict with the leaf. The old leaf turns
 * brown (in doubt) and the branch owner gets one question on the conflict card. Once per draft and leaf.
 */
export function disputeFromDraft(user: Person, a: DraftAnswer, now = new Date()): { leaf: Leaf; ownerId: string | null } {
  const { leaf: old } = assertLeafAccess(user, a.leafId);
  const ownerId = branchOwnerId(old.nodeId);
  const already = getDb().leaves.find((l) => l.conflictsWith === old.id && l.source.ref === a.ref);
  if (already) return { leaf: already, ownerId };
  const at = now.toISOString();
  const leaf: Leaf = {
    id: uid("l"),
    nodeId: old.nodeId,
    category: old.category,
    type: old.type,
    statement: a.claim,
    quote: a.sentence,
    people: [],
    source: draftSource(user, a, at),
    confidence: 1,
    status: "conflict",
    reconfirmedAt: [],
    usefulCount: 0,
    conflictsWith: old.id,
    conflictClaims: { said: a.said, noted: a.noted },
  };
  saveDb((db) => {
    db.leaves.push(leaf);
    db.leaves.find((x) => x.id === old.id)!.doubtedAt = at;
    const owner = person(ownerId);
    log(db, "leaf_conflict", old.nodeId, user.id, `wrote ${a.said} in a mail draft to ${a.to} and says it is correct; the leaf "${old.statement}" says ${a.noted}. The leaf is in doubt.${owner ? ` Asked ${owner.name}.` : ""}`, leaf.id);
  });
  return { leaf, ownerId };
}

function log(db: Db, action: ActivityAction, nodeId: string, actorId: string, summary: string, leafId?: string) {
  const n = db.nodes.find((x) => x.id === nodeId);
  if (!n) return;
  db.activity.push({ id: uid("a"), at: new Date().toISOString(), actorId, action, companyId: n.companyId, nodeId, ...(leafId ? { leafId } : {}), summary });
}

/** "Julien Moreau <julien@…>" → "Julien Moreau"; without a sender, the person who caught it. */
function saidBy(s: LeafSource) {
  return s.from?.replace(/\s*<.*>$/, "").trim() || person(s.byId)?.name || "someone";
}
