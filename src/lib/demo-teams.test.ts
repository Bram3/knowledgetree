import { signInAs, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { ingestText, teamsReactions } from "./leaf-actions";
import { leavesForCompany } from "./leaves";
import { resetDb } from "./db";
import { DEMO_TEAMS_MESSAGES, teamsReactionInput } from "./demo-teams";

// No GOOGLE_CLOUD_PROJECT: the real Vertex client refuses, so these run on the committed cache. No network.
delete process.env.GOOGLE_CLOUD_PROJECT;

const msg = (id: string) => DEMO_TEAMS_MESSAGES.find((m) => m.id === id)!;

beforeEach(async () => {
  resetDb();
  signOut();
  await signInAs("lena");
});

describe("🍃 reaction in Teams", () => {
  it("reacting to Sofie's cutoff message grows a leaf on Nike Deutschland GmbH with its quote and source teams", async () => {
    const { leaves } = await ingestText(teamsReactionInput(msg("m3")));
    expect(leaves.length).toBeGreaterThan(0);
    const [leaf] = leaves;
    expect(leaf).toMatchObject({
      nodeId: "nk-de-gmbh",
      category: "payroll",
      status: "auto",
      source: { channel: "teams", trigger: "reaction", ref: "teams:m3", from: "Sofie De Smet", byId: "lena" },
    });
    expect(msg("m3").text).toContain(leaf.quote);
    expect(leaf.path).toEqual(["Nike EMEA", "Germany", "Nike Deutschland GmbH"]);
  });

  it("reacting twice to the same message does not grow a second leaf", async () => {
    const before = leavesForCompany("nike").length;
    const first = await ingestText(teamsReactionInput(msg("m3")));
    const again = await ingestText(teamsReactionInput(msg("m3")));
    expect(again.leaves.map((l) => l.id)).toEqual(first.leaves.map((l) => l.id));
    expect(leavesForCompany("nike")).toHaveLength(before + first.leaves.length);
  });

  it("after a reload the 🍃 is still there: it comes from the stored leaves, not from the page", async () => {
    expect(await teamsReactions()).toEqual({});
    const { leaves } = await ingestText(teamsReactionInput(msg("m3")));
    const shown = await teamsReactions(); // what the Teams page loads
    expect(Object.keys(shown)).toEqual(["m3"]);
    expect(shown.m3).toMatchObject({ companyId: "nike", leaves: leaves.map((l) => ({ id: l.id, path: l.path })) });
  });

  it("someone without access to the customer doesn't see where the leaf grew", async () => {
    await ingestText(teamsReactionInput(msg("m3")));
    await signInAs("amelie");
    expect(await teamsReactions()).toEqual({});
  });

  it("reacting to the handover greeting keeps nothing", async () => {
    const before = leavesForCompany("nike");
    expect((await ingestText(teamsReactionInput(msg("m1")))).leaves).toEqual([]);
    expect(leavesForCompany("nike")).toEqual(before);
  });
});
