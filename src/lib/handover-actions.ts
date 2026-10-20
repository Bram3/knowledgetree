"use server";

import { requireCompanyAccess } from "./access";
import { handOver, markRoleChange } from "./handover";
import { revalidateAll } from "./revalidate";
import { idString, ValidationError } from "./validation";

/** Mark a colleague on this customer as having left or changed role (herfst). */
export async function markRoleChanged(personId: string, companyId: string) {
  const { user } = await requireCompanyAccess(idString(companyId, "customer id"));
  markRoleChange(user, idString(personId, "person id"), companyId);
  revalidateAll();
}

/** One click: hand everything `fromId` owns on the customer over to `toId`. Returns the handover for the brief. */
export async function handOverKnowledge(input: { companyId: string; fromId: string; toId: string }): Promise<{ handoverId: string }> {
  if (!input || typeof input !== "object") throw new ValidationError("Bad handover");
  const { user } = await requireCompanyAccess(idString(input.companyId, "customer id"));
  const h = handOver(user, { companyId: input.companyId, fromId: idString(input.fromId, "person id"), toId: idString(input.toId, "person id") });
  revalidateAll();
  return { handoverId: h.id };
}
