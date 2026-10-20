import { Redirect, signInAs, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { answerSecondThought, checkDraftText } from "./second-thought-actions";
import { answerConflict, conflictCards } from "./leaf-actions";
import { getLeaf } from "./leaves";
import { getDb, resetDb } from "./db";
import { season } from "./freshness";
import { AccessDeniedError } from "./access";
import { ValidationError } from "./validation";
import { DEMO_DRAFT } from "./demo-draft";
import type { SecondThought } from "./second-thought";

/**
 * Scene 2b through the server actions the Outlook compose mode calls, with Vertex unreachable: no
 * GOOGLE_CLOUD_PROJECT, so every model answer comes from the committed cache (src/lib/gemini-cache.json).
 */
delete process.env.GOOGLE_CLOUD_PROJECT;
delete process.env.GEMINI_PREFER_CACHE;

const REF = "draft:test-1";
const answer = (t: SecondThought, choice: string, ref = REF) => answerSecondThought({ choice, ref, to: DEMO_DRAFT.to, leafId: t.leafId, sentence: t.sentence, claim: t.claim, said: t.said, noted: t.noted });
const feed = () => getDb().activity.filter((a) => a.nodeId === "nk-fr");

beforeEach(async () => {
  resetDb();
  await signInAs("lena");
});

async function demoThought() {
  const thoughts = await checkDraftText(DEMO_DRAFT);
  expect(thoughts).toHaveLength(1);
  return thoughts[0];
}

describe("scene 2b: second thought on the draft to sarah@nike.fr", () => {
  it("the demo draft shows the card from the committed cache: the leaf, its source and ×4", async () => {
    expect(await demoThought()).toMatchObject({ leafId: "sl-fr-1", path: ["Nike EMEA", "France"], said: "the 15th", noted: "the 20th", times: 4, source: { channel: "mail", from: "Julien Moreau" } });
  });

  it("Change to 20th reconfirms the leaf (×5), once per mail, with names in the Changes feed", async () => {
    const t = await demoThought();
    await answer(t, "change");
    await answer(t, "change");
    expect(getLeaf("sl-fr-1")!.reconfirmedAt).toHaveLength(4);
    expect(feed()).toMatchObject([{ action: "leaf_reconfirmed", actorId: "lena", summary: expect.stringContaining("sarah@nike.fr") }]);
    expect(feed()[0].summary).toContain("×5");
  });

  it("15th is correct makes a new leaf from the draft sentence, the old leaf turns brown, and Sofie (branch owner) gets one question", async () => {
    const t = await demoThought();
    const { leaf } = await answer(t, "mine");
    expect(leaf).toMatchObject({ nodeId: "nk-fr", category: "payroll", status: "conflict", conflictsWith: "sl-fr-1", quote: t.sentence, source: { byId: "lena", channel: "mail" } });
    expect(season(getLeaf("sl-fr-1")!, new Date())).toBe("brown");
    expect(feed()).toMatchObject([{ action: "leaf_conflict", actorId: "lena", summary: expect.stringContaining("Sofie De Smet") }]);

    expect(await conflictCards()).toEqual([]);
    expect(await conflictCards("sofie")).toMatchObject([{ leaf: { id: leaf.id }, note: { id: "sl-fr-1" }, text: "Lena said the 15th, the leaf says the 20th." }]);
    // The same mail asks once.
    expect((await answer(t, "mine")).leaf.id).toBe(leaf.id);
  });

  it("Sofie answers: the new leaf is right → it is verified and the old leaf falls", async () => {
    const { leaf } = await answer(await demoThought(), "mine");
    await answerConflict(leaf.id, "correct", "sofie");
    expect(getLeaf(leaf.id)).toMatchObject({ status: "verified", verifiedById: "sofie" });
    expect(getLeaf("sl-fr-1")!.status).toBe("fallen");
    expect(await conflictCards("sofie")).toEqual([]);
  });

  it("Sofie answers: keep the leaf → the draft's leaf falls and the old one is no longer in doubt", async () => {
    const { leaf } = await answer(await demoThought(), "mine");
    await answerConflict(leaf.id, "keep", "sofie");
    expect(getLeaf(leaf.id)!.status).toBe("fallen");
    expect(season(getLeaf("sl-fr-1")!, new Date())).toBe("green");
  });

  it("after Change to 20th the draft agrees with the leaf: no card", async () => {
    const t = await demoThought();
    const text = DEMO_DRAFT.text.replace(t.sentence, t.sentence.replace(t.said, t.noted));
    expect(await checkDraftText({ ...DEMO_DRAFT, text })).toEqual([]);
  });
});

describe("rules", () => {
  it("needs a signed-in user", async () => {
    signOut();
    await expect(checkDraftText(DEMO_DRAFT)).rejects.toBeInstanceOf(Redirect);
  });

  it("someone without Nike gets nothing and can't answer on a Nike leaf", async () => {
    const t = await demoThought();
    await signInAs("amelie");
    expect(await checkDraftText(DEMO_DRAFT)).toEqual([]);
    await expect(answer(t, "change")).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("malformed answers are rejected", async () => {
    const t = await demoThought();
    await expect(answer(t, "delete")).rejects.toBeInstanceOf(ValidationError);
    await expect(answer({ ...t, sentence: "x".repeat(5_001) }, "mine")).rejects.toBeInstanceOf(ValidationError);
  });
});
