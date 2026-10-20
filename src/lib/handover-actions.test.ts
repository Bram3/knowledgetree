import { Redirect, signInAs, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { handOverKnowledge, markRoleChanged } from "./handover-actions";
import { AccessDeniedError } from "./access";
import { ValidationError } from "./validation";
import { resetDb } from "./db";
import { getHandover, orphanedKnowledge } from "./handover";

beforeEach(() => {
  resetDb();
  signOut();
});

describe("handover server actions", () => {
  it("require a signed-in user", async () => {
    await expect(markRoleChanged("jonas", "nike")).rejects.toBeInstanceOf(Redirect);
    await expect(handOverKnowledge({ companyId: "nike", fromId: "jonas", toId: "lena" })).rejects.toBeInstanceOf(Redirect);
  });

  it("Marta marks Jonas as changed role and hands his Nike knowledge to Lena", async () => {
    await signInAs("marta");
    await markRoleChanged("jonas", "nike");
    expect(orphanedKnowledge("nike")).toHaveLength(1);
    const { handoverId } = await handOverKnowledge({ companyId: "nike", fromId: "jonas", toId: "lena" });
    expect(getHandover(handoverId)).toMatchObject({ fromId: "jonas", toId: "lena", byId: "marta" });
    expect(orphanedKnowledge("nike")).toEqual([]);
  });

  it("refuses a successor without Nike access, and people without Nike access", async () => {
    await signInAs("marta");
    await markRoleChanged("jonas", "nike");
    await expect(handOverKnowledge({ companyId: "nike", fromId: "jonas", toId: "amelie" })).rejects.toBeInstanceOf(AccessDeniedError);
    await signInAs("amelie");
    await expect(markRoleChanged("jonas", "nike")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(handOverKnowledge({ companyId: "nike", fromId: "jonas", toId: "lena" })).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("rejects malformed input sent straight to the action", async () => {
    await signInAs("marta");
    await expect(handOverKnowledge({ companyId: "nike", fromId: 1, toId: "lena" } as never)).rejects.toBeInstanceOf(ValidationError);
    await expect(handOverKnowledge(null as never)).rejects.toBeInstanceOf(ValidationError);
    await expect(markRoleChanged({} as never, "nike")).rejects.toBeInstanceOf(ValidationError);
  });
});
