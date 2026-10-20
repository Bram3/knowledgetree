import { companyNodes, getDb, node, person, saveDb, uid } from "./db";
import { isLive } from "./leaves";
import { isCurrent } from "./freshness";
import { AccessDeniedError, assertCompanyAccess } from "./access";
import type { Handover, Item, Leaf, OrgNode, Person } from "./types";

/**
 * Scene 5 (herfst): knowledge risk, role change, successor and handover.
 * Pure functions on the store: callers pass the signed-in person where access matters.
 * Nothing here is stored except role changes and handovers; risk and briefs are computed on read.
 */

/** Ids of `nodeId` and every node below it. */
function subtree(nodeId: string): Set<string> {
  const n = node(nodeId);
  if (!n) return new Set();
  const nodes = companyNodes(n.companyId);
  const out = new Set([nodeId]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const x of nodes) if (x.parentId && out.has(x.parentId) && !out.has(x.id)) { out.add(x.id); grew = true; }
  }
  return out;
}

// ---------- contributors ----------

/**
 * Who a piece of knowledge comes from: whoever caught the leaf or wrote the note (or document), or whoever it
 * was handed over to since. This one notion drives both the knowledge risk and what a leaver holds.
 */
export function contributorOf(x: Leaf | Item): string {
  if ("statement" in x) return leafOwnerId(x);
  return getDb().handovers.findLast((h) => h.itemIds.includes(x.id))?.toId ?? x.createdById;
}

/** It comes only from `personId`: they contributed it and nobody else has said it again (reconfirmed it) since. */
export function onlyFrom(x: Leaf | Item, personId: string): boolean {
  return contributorOf(x) === personId && (x.reconfirmedBy ?? []).every((s) => s.byId === personId);
}

/** The single person each piece of knowledge on these nodes comes from (null when others reconfirmed it). */
function soleContributors(nodeIds: Set<string>, now: Date): (string | null)[] {
  const db = getDb();
  const sole = (x: Leaf | Item) => {
    const id = contributorOf(x);
    return onlyFrom(x, id) ? id : null;
  };
  return [
    ...db.leaves.filter((l) => nodeIds.has(l.nodeId) && isCurrent(l, now)).map(sole),
    ...db.items.filter((i) => nodeIds.has(i.nodeId) && i.kind === "note" && i.status === "active").map(sole),
  ];
}

export type KnowledgeRisk = {
  nodeId: string;
  nodeName: string;
  personId: string; // the single person most of it comes from
  count: number; // pieces of knowledge from that person
  total: number;
  percent: number; // rounded share, 0..100
};

/**
 * Share of the current leaves and notes on `nodeId` (and below) that come only from its biggest contributor
 * (see `onlyFrom`). Faded leaves don't count.
 */
export function knowledgeRisk(nodeId: string, now: Date): KnowledgeRisk | null {
  const n = node(nodeId);
  const from = soleContributors(subtree(nodeId), now);
  const counts = new Map<string, number>();
  for (const id of from) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  if (!n || !counts.size) return null;
  const [personId, count] = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return { nodeId, nodeName: n.name, personId, count, total: from.length, percent: Math.round((count / from.length) * 100) };
}

/**
 * The branch of a customer that leans most on one person, for the customer card.
 * Branches are the root's children (countries); ranked by how much knowledge hangs on that one person.
 */
export function customerRisk(companyId: string, now: Date): KnowledgeRisk | null {
  const nodes = companyNodes(companyId);
  const root = nodes.find((n) => !n.parentId);
  if (!root) return null;
  const branches: OrgNode[] = nodes.filter((n) => n.parentId === root.id);
  const risks = (branches.length ? branches : [root]).map((b) => knowledgeRisk(b.id, now)).filter((r): r is KnowledgeRisk => !!r);
  return risks.sort((a, b) => b.count - a.count || b.percent - a.percent)[0] ?? null;
}

// ---------- role change ----------

/** Owner of a leaf: whoever it was handed over to, else whoever caught it. */
export function leafOwnerId(l: Leaf): string {
  return l.ownerId ?? l.source.byId;
}

/** Throws AccessDeniedError unless `p` exists and is assigned to `companyId`. */
function assertOnCustomer(p: Person | null, companyId: string): Person {
  if (!p) throw new AccessDeniedError();
  assertCompanyAccess(p, companyId);
  return p;
}

/** `actor` marks a colleague on the same customer as having left or changed role. */
export function markRoleChange(actor: Person, personId: string, companyId: string, now = new Date()) {
  assertOnCustomer(actor, companyId);
  assertOnCustomer(person(personId), companyId);
  saveDb((db) => {
    const p = db.people.find((x) => x.id === personId)!;
    p.leftAt ??= now.toISOString();
  });
}

export type Holdings = { personId: string; leafIds: string[]; itemIds: string[] };

/** Live leaves and active items (notes and documents) of one customer that come only from `personId` (see `onlyFrom`). */
export function holdings(personId: string, companyId: string): Holdings {
  const ids = new Set(companyNodes(companyId).map((n) => n.id));
  const db = getDb();
  return {
    personId,
    leafIds: db.leaves.filter((l) => ids.has(l.nodeId) && isLive(l) && onlyFrom(l, personId)).map((l) => l.id),
    itemIds: db.items.filter((i) => ids.has(i.nodeId) && i.status === "active" && onlyFrom(i, personId)).map((i) => i.id),
  };
}

/** Knowledge of a customer that comes only from people who left: "34 leaves come only from Jonas. Who takes over?" */
export function orphanedKnowledge(companyId: string): Holdings[] {
  return getDb().people
    .filter((p) => p.leftAt)
    .map((p) => holdings(p.id, companyId))
    .filter((h) => h.leafIds.length || h.itemIds.length);
}

// ---------- successor ----------

export type Candidate = { personId: string; contributions: number; onCustomer: number };

/** Contributions per person on these nodes: leaves caught, items created, later versions written. */
function contributionCounts(nodeIds: Set<string>): Map<string, number> {
  const db = getDb();
  const out = new Map<string, number>();
  const add = (id: string) => out.set(id, (out.get(id) ?? 0) + 1);
  for (const l of db.leaves) if (nodeIds.has(l.nodeId)) add(l.source.byId);
  for (const i of db.items) {
    if (!nodeIds.has(i.nodeId)) continue;
    add(i.createdById);
    for (const v of i.versions) if (v.version > 1) add(v.byId);
  }
  return out;
}

/**
 * Who could take over `leaverId`'s knowledge on a customer, best first. Ranked by actual contributions
 * to the branches where that knowledge hangs, then to the whole customer. Only people assigned to the
 * customer (access check) who haven't left themselves are eligible.
 */
export function successorCandidates(leaverId: string, companyId: string): Candidate[] {
  const h = holdings(leaverId, companyId);
  const db = getDb();
  const where = [...db.leaves.filter((l) => h.leafIds.includes(l.id)), ...db.items.filter((i) => h.itemIds.includes(i.id))].map((x) => x.nodeId);
  const all = new Set(companyNodes(companyId).map((n) => n.id));
  const area = where.length ? new Set(where.flatMap((id) => [...subtree(id)])) : all;
  const local = contributionCounts(area);
  const overall = contributionCounts(all);
  return db.people
    .filter((p) => p.id !== leaverId && !p.leftAt && isEligible(p, companyId))
    .map((p) => ({ personId: p.id, contributions: local.get(p.id) ?? 0, onCustomer: overall.get(p.id) ?? 0 }))
    .sort((a, b) => b.contributions - a.contributions || b.onCustomer - a.onCustomer || a.personId.localeCompare(b.personId));
}

function isEligible(p: Person, companyId: string) {
  try {
    assertCompanyAccess(p, companyId);
    return true;
  } catch {
    return false;
  }
}

// ---------- handover ----------

/** "10 leaves and 4 items" */
export function holdingsLabel(h: Pick<Holdings, "leafIds" | "itemIds">): string {
  const leaves = h.leafIds.length, items = h.itemIds.length;
  const parts = [leaves ? `${leaves} ${leaves === 1 ? "leaf" : "leaves"}` : "", items ? `${items} ${items === 1 ? "item" : "items"}` : ""];
  return parts.filter(Boolean).join(" and ") || "nothing";
}

/**
 * One click: ownership of everything `fromId` owns on the customer moves to `toId`, and it is logged in Changes.
 * The actor and the successor must both be assigned to the customer; a successor who left can't be chosen.
 */
export function handOver(actor: Person, input: { companyId: string; fromId: string; toId: string }, now = new Date()): Handover {
  const { companyId, fromId, toId } = input;
  assertOnCustomer(actor, companyId);
  const from = person(fromId);
  const to = assertOnCustomer(person(toId), companyId);
  if (!from || to.leftAt || to.id === from.id) throw new AccessDeniedError();
  const root = companyNodes(companyId).find((n) => !n.parentId)!;
  const owned = holdings(fromId, companyId);
  const h: Handover = { id: uid("h"), companyId, fromId, toId, byId: actor.id, at: now.toISOString(), leafIds: owned.leafIds, itemIds: owned.itemIds };
  const leafIds = new Set(h.leafIds);
  const itemIds = new Set(h.itemIds);
  saveDb((db) => {
    for (const l of db.leaves) if (leafIds.has(l.id)) l.ownerId = toId;
    for (const i of db.items) if (itemIds.has(i.id)) i.ownerId = toId;
    db.handovers.push(h);
    db.activity.push({ id: uid("a"), at: h.at, actorId: actor.id, action: "handed_over", companyId, nodeId: root.id, summary: `handed over ${holdingsLabel(h)} from ${from.name} to ${to.name}` });
  });
  return h;
}

export function getHandover(id: string): Handover | null {
  return getDb().handovers.find((h) => h.id === id) ?? null;
}

// ---------- handover brief ----------

export type BriefSource = { label: string; href: string; quote?: string };
export type BriefPoint = { text: string; source: BriefSource };
export type HandoverBrief = {
  handover: Handover;
  companyName: string;
  fromName: string;
  toName: string;
  facts: BriefPoint[]; // key current facts: handed-over notes and documents, changes, decisions, promises, expertise
  conflicts: BriefPoint[]; // open conflicts on the handed-over leaves
  attention: BriefPoint[]; // attention points and customer risks
  people: BriefPoint[]; // who to call
};

const CHANNEL_LABEL: Record<Leaf["source"]["channel"], string> = { mail: "Mail", call: "Call", teams: "Teams message", browser: "Web page", voice: "Voice note" };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const nameOnly = (from: string) => from.replace(/\s*<.*>$/, "");

function leafSource(l: Leaf, companyId: string): BriefSource {
  const from = l.source.from ? ` from ${nameOnly(l.source.from)}` : "";
  return { label: `${CHANNEL_LABEL[l.source.channel]}${from}, ${day(l.source.at)}`, href: `/customers/${companyId}?node=${l.nodeId}&cat=${l.category}`, quote: l.quote };
}

/**
 * The brief the new owner gets for one customer, built from what was handed over. Computed on read, so it
 * follows later changes. Every point carries its source (a quote, a note version or the org chart).
 */
export function handoverBrief(user: Person, handoverId: string, now: Date): HandoverBrief {
  const h = getHandover(handoverId);
  if (!h) throw new AccessDeniedError();
  const c = assertCompanyAccess(user, h.companyId);
  const db = getDb();
  const leafIds = new Set(h.leafIds);
  const itemIds = new Set(h.itemIds);
  const leaves = db.leaves.filter((l) => leafIds.has(l.id) && isCurrent(l, now)); // faded leaves aren't current facts
  const items = db.items.filter((i) => itemIds.has(i.id) && i.status === "active");
  const base = `/customers/${c.id}`;

  const facts: BriefPoint[] = [
    ...items.map((i) => ({ text: i.title, source: { label: `${i.kind === "note" ? "Note" : "Document"} v${i.versions.length}, ${day(i.updatedAt)}`, href: `${base}?node=${i.nodeId}&cat=${i.category}&item=${i.id}` } })),
    ...leaves.filter((l) => l.status !== "conflict" && ["change", "decision", "promise", "expertise"].includes(l.type)).map((l) => ({ text: l.statement, source: leafSource(l, c.id) })),
  ];
  const attention = leaves.filter((l) => l.status !== "conflict" && (l.type === "attention" || l.type === "risk")).map((l) => ({ text: l.statement, source: leafSource(l, c.id) }));

  // A conflict is a leaf that contradicts a note (`conflictsWith` is the note's id).
  const conflicting = db.leaves.filter((l) => l.status === "conflict" && isLive(l) && (leafIds.has(l.id) || (l.conflictsWith && itemIds.has(l.conflictsWith))));
  const conflicts = conflicting.map((l) => {
    const note = l.conflictsWith ? db.items.find((i) => i.id === l.conflictsWith) : undefined;
    return { text: note ? `${l.statement} Conflicts with the note: ${note.title}` : l.statement, source: leafSource(l, c.id) };
  });

  // People to call: the previous owner, the customer contacts on the branches involved, people named in the leaves.
  const people: BriefPoint[] = [];
  const seen = new Set<string>();
  const addPerson = (name: string, text: string, source: BriefSource) => {
    if (seen.has(name)) return;
    seen.add(name);
    people.push({ text, source });
  };
  const from = person(h.fromId);
  if (from) addPerson(from.name, `${from.name}, previous owner${from.leftAt ? " (changed role)" : ""}, ${from.email}`, { label: `Handover on ${day(h.at)}`, href: base });
  const nodeIds = new Set([...leaves, ...items].map((x) => x.nodeId));
  const involved = companyNodes(c.id).filter((n) => [...nodeIds].some((id) => id === n.id || isAncestor(n.id, id)));
  for (const n of involved) for (const ct of n.contacts ?? []) addPerson(ct.name, `${ct.name}, ${ct.role} (${ct.email})`, { label: `Org chart: ${n.name}`, href: `${base}?node=${n.id}` });
  for (const l of leaves) for (const name of l.people) addPerson(name, name, leafSource(l, c.id));

  return { handover: h, companyName: c.name, fromName: from?.name ?? h.fromId, toName: person(h.toId)?.name ?? h.toId, facts, conflicts, attention, people };
}

function isAncestor(ancestorId: string, nodeId: string): boolean {
  for (let n = node(nodeId); n?.parentId; n = node(n.parentId)) if (n.parentId === ancestorId) return true;
  return false;
}
