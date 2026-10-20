"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { AccessDeniedError, assertNodeAccess } from "./access";
import { getLeaf, updateLeaf } from "./leaves";
import { parseMonthsAhead, SIM_COOKIE } from "./sim-date";

/** Time slider: set the simulated date to today + `months` (clamped 0..12). 0 resets to today. */
export async function setMonthsAhead(months: number): Promise<void> {
  await requireUser();
  const m = parseMonthsAhead(months);
  const jar = await cookies();
  if (m === 0) jar.delete(SIM_COOKIE);
  else jar.set(SIM_COOKIE, String(m), { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  revalidatePath("/", "layout");
}

/** "Useful" on a leaf: implicit verification by use. Each mark slows the leaf's fading (see freshness.ts). */
export async function markLeafUseful(leafId: string): Promise<{ usefulCount: number }> {
  const user = await requireUser();
  const leaf = typeof leafId === "string" ? getLeaf(leafId) : null;
  if (!leaf) throw new AccessDeniedError();
  assertNodeAccess(user, leaf.nodeId);
  const updated = updateLeaf(leaf.id, (l) => void (l.usefulCount += 1));
  revalidatePath("/", "layout");
  return { usefulCount: updated?.usefulCount ?? leaf.usefulCount };
}
