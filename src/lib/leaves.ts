import { getDb, saveDb, companyNodes } from "./db";
import type { Channel, Leaf } from "./types";

/**
 * Leaf store. Leaves live next to items in the JSON store (`db.leaves`).
 * These functions do no access checks: callers check access first (see access.ts).
 */

/** Leaves hanging on one node (seeds included), newest first. */
export function leavesForNode(nodeId: string): Leaf[] {
  return getDb().leaves.filter((l) => l.nodeId === nodeId).sort(newestFirst);
}

/** All leaves of one customer, newest first. */
export function leavesForCompany(companyId: string): Leaf[] {
  const ids = new Set(companyNodes(companyId).map((n) => n.id));
  return getDb().leaves.filter((l) => ids.has(l.nodeId)).sort(newestFirst);
}

/** Leaves already caught from one message or call, so a channel can re-run ingest without duplicates. */
export function leavesFromSource(channel: Channel, ref: string): Leaf[] {
  return getDb().leaves.filter((l) => l.source.channel === channel && l.source.ref === ref);
}

export function getLeaf(id: string): Leaf | null {
  return getDb().leaves.find((l) => l.id === id) ?? null;
}

export function addLeaves(leaves: Leaf[]) {
  if (!leaves.length) return;
  saveDb((db) => void db.leaves.push(...leaves));
}

/** Change one leaf in place (status, reconfirmedAt, usefulCount, ...). Returns the updated leaf, or null if unknown. */
export function updateLeaf(id: string, mutate: (leaf: Leaf) => void): Leaf | null {
  let out: Leaf | null = null;
  saveDb((db) => {
    const l = db.leaves.find((x) => x.id === id);
    if (!l) return;
    mutate(l);
    out = l;
  });
  return out;
}

/** Leaves that count as "on the tree" (not fallen or promoted). */
export function isLive(l: Leaf) {
  return l.status !== "fallen" && l.status !== "promoted";
}

export type LeafCount = { total: number; seeds: number; byCategory: Record<string, number> };

/** Live leaf counts per node of a customer, for the tree indicators. Seeds are counted apart from categories. */
export function leafCounts(companyId: string): Record<string, LeafCount> {
  const out: Record<string, LeafCount> = {};
  for (const n of companyNodes(companyId)) out[n.id] = { total: 0, seeds: 0, byCategory: {} };
  for (const l of getDb().leaves) {
    const c = out[l.nodeId];
    if (!c || !isLive(l)) continue;
    c.total++;
    if (l.status === "seed") c.seeds++;
    else c.byCategory[l.category] = (c.byCategory[l.category] ?? 0) + 1;
  }
  return out;
}

const newestFirst = (a: Leaf, b: Leaf) => b.source.at.localeCompare(a.source.at);
