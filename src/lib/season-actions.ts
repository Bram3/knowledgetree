"use server";

import { cookies } from "next/headers";
import { requireUser, SESSION_COOKIE_OPTIONS } from "./auth";
import { requireLeafAccess } from "./access";
import { updateLeaf } from "./leaves";
import { parseMonthsAhead, SIM_COOKIE } from "./sim-date";
import { revalidateAll } from "./revalidate";
import { idString } from "./validation";

/** Time slider: set the simulated date to today + `months` (clamped 0..12). 0 resets to today. */
export async function setMonthsAhead(months: number): Promise<void> {
  await requireUser();
  const m = parseMonthsAhead(months);
  const jar = await cookies();
  if (m === 0) jar.delete(SIM_COOKIE);
  else jar.set(SIM_COOKIE, String(m), SESSION_COOKIE_OPTIONS);
  revalidateAll();
}

/** "Useful" on a leaf: implicit verification by use. Each mark slows the leaf's fading (see freshness.ts). */
export async function markLeafUseful(leafId: string): Promise<{ usefulCount: number }> {
  const { leaf } = await requireLeafAccess(idString(leafId, "leaf id"));
  const updated = updateLeaf(leaf.id, (l) => void (l.usefulCount += 1));
  revalidateAll();
  return { usefulCount: updated?.usefulCount ?? leaf.usefulCount };
}
