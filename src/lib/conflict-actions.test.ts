import { Redirect, signInAs, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { conflictCards, answerConflict, viewAsOptions } from "./leaf-actions";
import { ingest } from "./ingest";
import { getLeaf } from "./leaves";
import { getDb, resetDb, person } from "./db";
import { AccessDeniedError } from "./access";
import type { ModelClient } from "./gemini";

/** Lena's call with Katrin: the cutoff moves to the 20th, which contradicts Jonas's note (the 15th). */
const CALL = "Katrin: from next month the payroll cutoff for Nike Deutschland GmbH moves from the 15th to the 20th.";
const model: ModelClient = {
  generate: async (req) => JSON.stringify(JSON.stringify(req.schema).includes('"relation"')
    ? (JSON.stringify(req.parts).includes("Payroll cutoff Germany: the 15th") ? { relation: "contradicts", said: "the 20th", noted: "the 15th" } : { relation: "unrelated", said: null, noted: null })
    : { leaves: [{ type: "change", statement: "From next month the payroll cutoff for Nike Deutschland GmbH moves to the 20th.", why: null, quote: "from next month the payroll cutoff for Nike Deutschland GmbH moves from the 15th to the 20th", people: ["Katrin Vogel"], confidence: 0.92, nodeId: "nk-de-gmbh", category: "payroll" }] }),
};

async function callWithKatrin() {
  const { leaves } = await ingest(person("lena")!, { channel: "call", trigger: "auto", text: CALL, ref: "call:katrin-1", from: "Katrin Vogel <katrin.vogel@nike.com>" }, { model });
  return leaves[0];
}

const note = () => getDb().items.find((i) => i.id === "i-nk-de-cutoff-new")!;

beforeEach(() => {
  resetDb();
  signOut();
});

describe("the owner's conflict card", () => {
  it("Jonas sees exactly one card, nobody else gets one", async () => {
    const leaf = await callWithKatrin();
    await signInAs("jonas");
    expect(await conflictCards()).toMatchObject([{ leaf: { id: leaf.id }, note: { id: "i-nk-de-cutoff-new", version: 2 }, text: "Katrin said the 20th, your note says the 15th." }]);
    for (const id of ["lena", "tom", "sofie", "marta"]) {
      await signInAs(id);
      expect(await conflictCards()).toEqual([]);
    }
  });

  it("Lena can view the Teams mock as Jonas without logging out", async () => {
    await callWithKatrin();
    await signInAs("lena");
    expect(await conflictCards("jonas")).toHaveLength(1);
    expect((await viewAsOptions()).map((p) => p.id)).toContain("jonas");
  });

  it("viewing as is limited to people who share a customer with you, and to those customers", async () => {
    await callWithKatrin();
    await signInAs("amelie"); // basicfit + arcelormittal: no Nike
    expect(await conflictCards("jonas")).toEqual([]);
    const options = (await viewAsOptions()).map((p) => p.id);
    expect(options).toContain("jonas"); // shares ArcelorMittal
    for (const id of options) expect(person(id)!.customerIds.some((c) => person("amelie")!.customerIds.includes(c))).toBe(true);
    await signInAs("lena");
    await expect(conflictCards("amelie")).rejects.toBeInstanceOf(AccessDeniedError); // Lena and Amélie share no customer
  });

  it("requires a signed-in user", async () => {
    await expect(conflictCards()).rejects.toBeInstanceOf(Redirect);
    await expect(answerConflict("x", "keep")).rejects.toBeInstanceOf(Redirect);
  });
});

describe("one tap", () => {
  it("Correct: the note gets a new version with the call as its source, and the leaf becomes verified", async () => {
    const leaf = await callWithKatrin();
    await signInAs("jonas");
    await answerConflict(leaf.id, "correct");

    const n = note();
    expect(n.versions).toHaveLength(3);
    expect(n.versions[2]).toMatchObject({ version: 3, byId: "jonas", source: { channel: "call", ref: "call:katrin-1", leafId: leaf.id }, note: expect.stringContaining("Katrin Vogel said the 20th") });
    expect(n.title).toBe("Payroll cutoff Germany: the 20th of the month");
    expect(n.content).toContain("moves to the 20th");
    expect(getLeaf(leaf.id)).toMatchObject({ status: "verified", verifiedById: "jonas" });
    expect(await conflictCards()).toEqual([]);
    expect(getDb().activity.at(-1)).toMatchObject({ action: "new_version", actorId: "jonas", itemId: "i-nk-de-cutoff-new", summary: expect.stringContaining("version 3") });
  });

  it("Keep mine: the leaf falls and the note stays as it is", async () => {
    const leaf = await callWithKatrin();
    await signInAs("jonas");
    await answerConflict(leaf.id, "keep");
    expect(getLeaf(leaf.id)!.status).toBe("fallen");
    expect(note().versions).toHaveLength(2);
    expect(getDb().activity.at(-1)).toMatchObject({ action: "leaf_kept", actorId: "jonas" });
  });

  it("Not sure: the card goes away and the conflict waits in the digest", async () => {
    const leaf = await callWithKatrin();
    await signInAs("jonas");
    await answerConflict(leaf.id, "unsure");
    expect(getLeaf(leaf.id)).toMatchObject({ status: "conflict", deferredAt: expect.any(String) });
    expect(await conflictCards()).toEqual([]);
    expect(getDb().activity.at(-1)).toMatchObject({ action: "leaf_deferred", actorId: "jonas" });
  });

  it("Lena viewing as Jonas answers as Jonas", async () => {
    const leaf = await callWithKatrin();
    await signInAs("lena");
    await answerConflict(leaf.id, "correct", "jonas");
    expect(note().versions[2].byId).toBe("jonas");
  });

  it("only the note's owner can answer; a second tap changes nothing", async () => {
    const leaf = await callWithKatrin();
    await signInAs("lena");
    await expect(answerConflict(leaf.id, "keep")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(answerConflict(leaf.id, "keep", "tom")).rejects.toBeInstanceOf(AccessDeniedError);
    await signInAs("amelie");
    await expect(answerConflict(leaf.id, "keep", "jonas")).rejects.toBeInstanceOf(AccessDeniedError);
    await signInAs("jonas");
    await answerConflict(leaf.id, "correct");
    await answerConflict(leaf.id, "keep");
    expect(getLeaf(leaf.id)!.status).toBe("verified");
    expect(note().versions).toHaveLength(3);
  });

  it("rejects an unknown choice", async () => {
    const leaf = await callWithKatrin();
    await signInAs("jonas");
    await expect(answerConflict(leaf.id, "delete" as never)).rejects.toThrow();
    expect(getLeaf(leaf.id)!.status).toBe("conflict");
  });
});
