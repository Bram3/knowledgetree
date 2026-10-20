"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { getDb, nodePath, person } from "./db";
import { ingest, validateIngestInput } from "./ingest";
import { getLeaf } from "./leaves";
import { assertNodeAccess, AccessDeniedError } from "./access";
import { conflictCardsFor, resolveConflict, CONFLICT_CHOICES, type ConflictCard, type ConflictChoice } from "./compare";
import type { Leaf, Person } from "./types";

export type IngestedLeaf = Leaf & { path: string[] };

/**
 * Server action for every channel UI (Outlook, Teams, call, voice): ingest text as the signed-in user.
 * Input is validated (it can be POSTed directly). Returns the leaves with their node path for display.
 */
export async function ingestText(input: unknown): Promise<{ leaves: IngestedLeaf[]; reconfirmed: IngestedLeaf[]; companyId: string | null }> {
  const user = await requireUser();
  const res = await ingest(user, validateIngestInput(input));
  if (res.leaves.length || res.reconfirmed.length) revalidatePath("/", "layout");
  const withPath = (l: Leaf) => ({ ...l, path: nodePath(l.nodeId).map((n) => n.name) });
  return { companyId: res.companyId, leaves: res.leaves.map(withPath), reconfirmed: res.reconfirmed.map(withPath) };
}

// ---------- conflicts: one card for the owner, one tap ----------

/**
 * "Viewing as" (Teams mock demo switch): the signed-in user may look at, and answer, the cards of someone
 * who shares at least one customer with them, and only for customers they can access themselves.
 */
function viewAs(user: Person, asPersonId?: string): Person {
  if (asPersonId === undefined || asPersonId === user.id) return user;
  const p = typeof asPersonId === "string" ? person(asPersonId) : undefined;
  if (!p || !p.customerIds.some((c) => user.customerIds.includes(c))) throw new AccessDeniedError();
  return p;
}

/** People the signed-in user may switch the Teams mock to (themselves included). */
export async function viewAsOptions(): Promise<{ id: string; name: string; me: boolean }[]> {
  const user = await requireUser();
  return getDb().people
    .filter((p) => p.id === user.id || p.customerIds.some((c) => user.customerIds.includes(c)))
    .map((p) => ({ id: p.id, name: p.name, me: p.id === user.id }));
}

/** Open conflict cards for the signed-in user, or for the person they view the Teams mock as. */
export async function conflictCards(asPersonId?: string): Promise<ConflictCard[]> {
  const user = await requireUser();
  return conflictCardsFor(user, viewAs(user, asPersonId));
}

/** The owner's one tap on a conflict card: "correct" | "keep" | "unsure". Only the note's owner may answer. */
export async function answerConflict(leafId: string, choice: ConflictChoice, asPersonId?: string): Promise<Leaf> {
  const user = await requireUser();
  if (!CONFLICT_CHOICES.includes(choice)) throw new Error("Unknown answer");
  const leaf = typeof leafId === "string" ? getLeaf(leafId) : null;
  if (!leaf) throw new AccessDeniedError();
  assertNodeAccess(user, leaf.nodeId);
  const out = resolveConflict(viewAs(user, asPersonId), leafId, choice);
  revalidatePath("/", "layout");
  return out;
}
