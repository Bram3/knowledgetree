import type { Leaf, LeafType } from "./types";

/**
 * Seasons: how fresh a leaf is at a given moment. Pure: computed when leaves are read, never stored,
 * so any "now" works (the real date, or the simulated date from the demo time slider).
 */

/** Days until an unconfirmed, unused leaf of this type is half as fresh. */
export const HALF_LIFE_DAYS: Record<LeafType, number> = {
  promise: 14,
  change: 60,
  attention: 180,
  decision: 365,
  expertise: 365,
  risk: 90,
};

/** Each reconfirmation (someone said it again) adds this many half-lives. */
export const RECONFIRM_BOOST = 1;
/** Each "useful" mark (implicit verification by using it) adds this many half-lives. */
export const USEFUL_BOOST = 0.5;

const DAY_MS = 86_400_000;

/**
 * Freshness from 1 (just caught) towards 0, at `now`: exponential decay by leaf type.
 * The clock restarts at the latest reconfirmation, and every reconfirmation or useful mark
 * lengthens the half-life, so knowledge that keeps coming back or keeps being used stays green.
 */
export function freshness(leaf: Leaf, now: Date): number {
  const lastSeen = Math.max(Date.parse(leaf.source.at), ...leaf.reconfirmedAt.map((t) => Date.parse(t)));
  const ageDays = Math.max(0, (now.getTime() - lastSeen) / DAY_MS);
  const halfLife = HALF_LIFE_DAYS[leaf.type] * (1 + RECONFIRM_BOOST * leaf.reconfirmedAt.length + USEFUL_BOOST * leaf.usefulCount);
  return Math.pow(0.5, ageDays / halfLife);
}

/** Colour bands on the tree and in the panel. Below FALL_THRESHOLD a leaf has fallen (archive). */
export type Season = "green" | "yellow" | "brown" | "fallen";
export const FALL_THRESHOLD = 0.3;
const BROWN_BELOW = 0.5;
const YELLOW_BELOW = 0.75;

export function seasonOf(f: number): Season {
  if (f < FALL_THRESHOLD) return "fallen";
  if (f < BROWN_BELOW) return "brown";
  if (f < YELLOW_BELOW) return "yellow";
  return "green";
}

/** A leaf in doubt (#19: the opposite was said to be correct, the owner hasn't answered yet) is at most brown. */
export function season(leaf: Leaf, now: Date): Season {
  if (leaf.status === "fallen") return "fallen";
  const s = seasonOf(freshness(leaf, now));
  return leaf.doubtedAt && (s === "green" || s === "yellow") ? "brown" : s;
}

/** On the tree at `now`: not promoted and not fallen (marked fallen, or faded below the threshold). */
export function isCurrent(leaf: Leaf, now: Date): boolean {
  return leaf.status !== "promoted" && season(leaf, now) !== "fallen";
}

/** A leaf with its freshness at a given moment, for display (the client doesn't need the clock). */
export type FreshLeaf = Leaf & { freshness: number; season: Season };

export function withFreshness(leaf: Leaf, now: Date): FreshLeaf {
  return { ...leaf, freshness: freshness(leaf, now), season: season(leaf, now) };
}

/** In the archive at `now`: fallen, still viewable, never deleted. */
export function isArchived(leaf: Leaf, now: Date): boolean {
  return leaf.status !== "promoted" && season(leaf, now) === "fallen";
}
