"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyAccess, AccessDeniedError } from "./access";
import { handOver, markRoleChange } from "./handover";

const str = (v: unknown) => {
  if (typeof v !== "string" || !v || v.length > 100) throw new AccessDeniedError();
  return v;
};

/** Mark a colleague on this customer as having left or changed role (herfst). */
export async function markRoleChanged(personId: string, companyId: string) {
  const { user } = await requireCompanyAccess(str(companyId));
  markRoleChange(user, str(personId), companyId);
  revalidatePath("/", "layout");
}

/** One click: hand everything `fromId` owns on the customer over to `toId`. Returns the handover for the brief. */
export async function handOverKnowledge(input: { companyId: string; fromId: string; toId: string }): Promise<{ handoverId: string }> {
  const { user } = await requireCompanyAccess(str(input?.companyId));
  const h = handOver(user, { companyId: input.companyId, fromId: str(input.fromId), toId: str(input.toId) });
  revalidatePath("/", "layout");
  return { handoverId: h.id };
}
