"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { nodePath } from "./db";
import { ingest, validateIngestInput } from "./ingest";
import type { Leaf } from "./types";

export type IngestedLeaf = Leaf & { path: string[] };

/**
 * Server action for every channel UI (Outlook, Teams, call, voice): ingest text as the signed-in user.
 * Input is validated (it can be POSTed directly). Returns the leaves with their node path for display.
 */
export async function ingestText(input: unknown): Promise<{ leaves: IngestedLeaf[]; companyId: string | null }> {
  const user = await requireUser();
  const res = await ingest(user, validateIngestInput(input));
  if (res.leaves.length) revalidatePath("/", "layout");
  return { companyId: res.companyId, leaves: res.leaves.map((l) => ({ ...l, path: nodePath(l.nodeId).map((n) => n.name) })) };
}
