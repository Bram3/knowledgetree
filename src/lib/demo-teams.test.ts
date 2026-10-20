import { signInAs, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { ingestText } from "./leaf-actions";
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
    const first = await ingestText(teamsReactionInput(msg("m3")));
    const again = await ingestText(teamsReactionInput(msg("m3")));
    expect(again.leaves.map((l) => l.id)).toEqual(first.leaves.map((l) => l.id));
    expect(leavesForCompany("nike")).toHaveLength(first.leaves.length);
  });

  it("reacting to the handover greeting keeps nothing", async () => {
    expect((await ingestText(teamsReactionInput(msg("m1")))).leaves).toEqual([]);
    expect(leavesForCompany("nike")).toEqual([]);
  });
});
