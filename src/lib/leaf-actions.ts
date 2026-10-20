"use server";

import { canAccess, requireUser, sharesCustomer } from "./auth";
import { getDb, node, nodePath, person } from "./db";
import { ingest, validateIngestInput, type IngestResult } from "./ingest";
import { ingestDemoCall } from "./demo-call";
import { leavesFromSource, removeLeaves } from "./leaves";
import { AccessDeniedError, requireLeafAccess } from "./access";
import { conflictCardsFor, resolveConflict, leavesReconfirmedBy, notesReconfirmedBy, CONFLICT_CHOICES, type ConflictCard, type ConflictChoice, type ReconfirmedNote } from "./compare";
import { DEMO_TEAMS_MESSAGES, teamsReactionInput } from "./demo-teams";
import { revalidateAll } from "./revalidate";
import { idList, idString, ValidationError } from "./validation";
import type { Leaf, Person } from "./types";

export type IngestedLeaf = Leaf & { path: string[] };

export type Ingested = { leaves: IngestedLeaf[]; reconfirmed: IngestedLeaf[]; reconfirmedNotes: ReconfirmedNote[]; companyId: string | null };

/** New leaves plus the known leaves and notes this message reconfirmed (×n), each leaf with its node path for display. */
function withPaths(res: IngestResult): Ingested {
  const withPath = (l: Leaf) => ({ ...l, path: nodePath(l.nodeId).map((n) => n.name) });
  return { companyId: res.companyId, leaves: res.leaves.map(withPath), reconfirmed: res.reconfirmed.map(withPath), reconfirmedNotes: res.reconfirmedNotes };
}

/**
 * Server action for every channel UI (Outlook, Teams, call, voice): ingest text as the signed-in user.
 * Input is validated (it can be POSTed directly). Returns the leaves with their node path for display.
 */
export async function ingestText(input: unknown): Promise<Ingested> {
  const user = await requireUser();
  return grown(withPaths(await ingest(user, validateIngestInput(input))));
}

/** Hang up the demo call: the server transcribes its own demo audio and ingests it (call channel, trigger auto). */
export async function endDemoCall(): Promise<Ingested> {
  const user = await requireUser();
  return grown(withPaths(await ingestDemoCall(user)));
}

/** Refresh the tree when a message grew or reconfirmed something. */
function grown(res: Ingested): Ingested {
  if (res.leaves.length || res.reconfirmed.length || res.reconfirmedNotes.length) revalidateAll();
  return res;
}

/**
 * The 🍃 reactions in the Teams chat, from what is stored: per message id, the leaves (and known leaves or notes)
 * its reaction grew, on customers the signed-in user can access. A reaction that kept nothing isn't stored.
 */
export async function teamsReactions(): Promise<Record<string, Ingested>> {
  const user = await requireUser();
  const visible = (nodeId: string) => {
    const n = node(nodeId);
    return n && canAccess(user, n.companyId) ? n.companyId : null;
  };
  const out: Record<string, Ingested> = {};
  for (const m of DEMO_TEAMS_MESSAGES) {
    const { channel, ref } = teamsReactionInput(m);
    const res = {
      leaves: leavesFromSource(channel, ref).filter((l) => visible(l.nodeId)),
      reconfirmed: leavesReconfirmedBy(channel, ref).filter((l) => visible(l.nodeId)),
      reconfirmedNotes: notesReconfirmedBy(channel, ref).filter((n) => visible(n.nodeId)),
    };
    const first = res.leaves[0] ?? res.reconfirmed[0] ?? res.reconfirmedNotes[0];
    if (first) out[m.id] = withPaths({ ...res, companyId: visible(first.nodeId) });
  }
  return out;
}

const MAX_UNDO = 10;

/**
 * Undo from the "🍃 n leaves caught" toast: delete leaves the signed-in user just caught.
 * Only the person who caught a leaf may undo it, and only on a customer they still have access to.
 * All or nothing: one foreign or unknown id throws AccessDeniedError and nothing is removed.
 * Ids that aren't a short list of strings throw ValidationError.
 */
export async function undoLeaves(ids: unknown): Promise<void> {
  await requireUser();
  const leafIds = idList(ids, MAX_UNDO, "leaf ids");
  for (const id of leafIds) {
    const { user, leaf } = await requireLeafAccess(id);
    if (leaf.source.byId !== user.id) throw new AccessDeniedError();
  }
  removeLeaves(leafIds);
  revalidateAll();
}

// ---------- conflicts: one card for the owner, one tap ----------

/**
 * "Viewing as" (Teams mock demo switch): the signed-in user may look at, and answer, the cards of someone
 * who shares at least one customer with them, and only for customers they can access themselves.
 */
function viewAs(user: Person, asPersonId?: string): Person {
  if (asPersonId === undefined || asPersonId === user.id) return user;
  const p = person(idString(asPersonId, "person id"));
  if (!p || !sharesCustomer(user, p)) throw new AccessDeniedError();
  return p;
}

/** People the signed-in user may switch the Teams mock to (themselves included). */
export async function viewAsOptions(): Promise<{ id: string; name: string; me: boolean }[]> {
  const user = await requireUser();
  return getDb().people
    .filter((p) => p.id === user.id || sharesCustomer(user, p))
    .map((p) => ({ id: p.id, name: p.name, me: p.id === user.id }));
}

/** Open conflict cards for the signed-in user, or for the person they view the Teams mock as. */
export async function conflictCards(asPersonId?: string): Promise<ConflictCard[]> {
  const user = await requireUser();
  return conflictCardsFor(user, viewAs(user, asPersonId));
}

/** The owner's one tap on a conflict card: "correct" | "keep" | "unsure". Only the note's owner may answer. */
export async function answerConflict(leafId: string, choice: ConflictChoice, asPersonId?: string): Promise<Leaf> {
  const { user } = await requireLeafAccess(idString(leafId, "leaf id"));
  if (!CONFLICT_CHOICES.includes(choice)) throw new ValidationError("Unknown answer");
  const out = resolveConflict(viewAs(user, asPersonId), leafId, choice, { actor: user });
  revalidateAll();
  return out;
}
