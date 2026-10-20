"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { nodePath } from "./db";
import { ingest, validateIngestInput, type IngestResult } from "./ingest";
import { ingestDemoCall } from "./demo-call";
import { getLeaf, removeLeaves } from "./leaves";
import { AccessDeniedError, assertNodeAccess } from "./access";
import type { Leaf } from "./types";

export type IngestedLeaf = Leaf & { path: string[] };

function withPaths(res: IngestResult): { leaves: IngestedLeaf[]; companyId: string | null } {
  if (res.leaves.length) revalidatePath("/", "layout");
  return { companyId: res.companyId, leaves: res.leaves.map((l) => ({ ...l, path: nodePath(l.nodeId).map((n) => n.name) })) };
}

/**
 * Server action for every channel UI (Outlook, Teams, call, voice): ingest text as the signed-in user.
 * Input is validated (it can be POSTed directly). Returns the leaves with their node path for display.
 */
export async function ingestText(input: unknown): Promise<{ leaves: IngestedLeaf[]; companyId: string | null }> {
  const user = await requireUser();
  return withPaths(await ingest(user, validateIngestInput(input)));
}

/** Hang up the demo call: the server transcribes its own demo audio and ingests it (call channel, trigger auto). */
export async function endDemoCall(): Promise<{ leaves: IngestedLeaf[]; companyId: string | null }> {
  const user = await requireUser();
  return withPaths(await ingestDemoCall(user));
}

const MAX_UNDO = 10;

/**
 * Undo from the "🍃 n leaves caught" toast: delete leaves the signed-in user just caught.
 * Only the person who caught a leaf may undo it, and only on a customer they still have access to.
 * All or nothing: one foreign or unknown id throws AccessDeniedError and nothing is removed.
 */
export async function undoLeaves(ids: unknown): Promise<void> {
  const user = await requireUser();
  if (!Array.isArray(ids) || ids.length > MAX_UNDO || !ids.every((id) => typeof id === "string")) throw new AccessDeniedError("Bad leaf ids");
  for (const id of ids) {
    const leaf = getLeaf(id);
    if (!leaf || leaf.source.byId !== user.id) throw new AccessDeniedError();
    assertNodeAccess(user, leaf.nodeId);
  }
  removeLeaves(ids);
  revalidatePath("/", "layout");
}
