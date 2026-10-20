import { getDb, saveDb, companyNodes } from "./db";
import type { Channel, Leaf } from "./types";
import { isArchived, isCurrent, season, type Season } from "./freshness";

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

/** Delete leaves outright (undo right after capture). Unknown ids are ignored. */
export function removeLeaves(ids: string[]) {
  const drop = new Set(ids);
  if (!drop.size) return;
  saveDb((db) => {
    db.leaves = db.leaves.filter((l) => !drop.has(l.id));
  });
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

/** Leaves on the tree at `now` (seeds included): not promoted, not fallen, not faded below the threshold. */
export function currentLeaves(nodeId: string, now: Date): Leaf[] {
  return leavesForNode(nodeId).filter((l) => isCurrent(l, now));
}

/** Fallen leaves of a node at `now`: still viewable, never deleted. Moving the date back brings them back. */
export function archivedLeaves(nodeId: string, now: Date): Leaf[] {
  return leavesForNode(nodeId).filter((l) => isArchived(l, now));
}

export type SeasonCount = Record<Exclude<Season, "fallen">, number>;
export type LeafCount = {
  total: number; // current leaves, seeds included
  seeds: number;
  fallen: number; // in the archive
  byCategory: Record<string, number>; // current, placed leaves
  seasons: SeasonCount; // placed leaves by colour
  categorySeasons: Record<string, SeasonCount>;
  conflicts: number; // placed leaves that contradict a note (shown in red)
  categoryConflicts: Record<string, number>;
};

const noSeasons = (): SeasonCount => ({ green: 0, yellow: 0, brown: 0 });

/** Leaf counts per node of a customer at `now`, for the tree indicators. Seeds are counted apart from categories. */
export function leafCounts(companyId: string, now: Date): Record<string, LeafCount> {
  const out: Record<string, LeafCount> = {};
  for (const n of companyNodes(companyId)) out[n.id] = { total: 0, seeds: 0, fallen: 0, byCategory: {}, seasons: noSeasons(), categorySeasons: {}, conflicts: 0, categoryConflicts: {} };
  for (const l of getDb().leaves) {
    const c = out[l.nodeId];
    if (!c || l.status === "promoted") continue;
    const s = season(l, now);
    if (s === "fallen") {
      c.fallen++;
      continue;
    }
    c.total++;
    if (l.status === "seed") {
      c.seeds++;
      continue;
    }
    c.byCategory[l.category] = (c.byCategory[l.category] ?? 0) + 1;
    c.seasons[s]++;
    (c.categorySeasons[l.category] ??= noSeasons())[s]++;
    if (l.status === "conflict") {
      c.conflicts++;
      c.categoryConflicts[l.category] = (c.categoryConflicts[l.category] ?? 0) + 1;
    }
  }
  return out;
}

const newestFirst = (a: Leaf, b: Leaf) => b.source.at.localeCompare(a.source.at);
