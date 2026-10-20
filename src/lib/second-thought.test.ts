import "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { checkDraft, validateDraft, MAX_DRAFT_CHARS } from "./second-thought";
import { ValidationError } from "./validation";
import { resetDb, person } from "./db";
import type { ModelClient, ModelRequest } from "./gemini";
import { DEMO_DRAFT } from "./demo-draft";
import { rewriteClaim } from "./second-thought-prompt";

/**
 * #19 Second thought: Leafe checks a draft against the leaves on the recipient's branch before it is sent.
 * The fake model answers claim extraction with `claims(sentence)` and comparisons with `judge(text)`.
 */
type Judgement = { relation: "same" | "contradicts" | "unrelated"; said?: string | null; noted?: string | null };
type Claim = { statement: string; category: string | null };

function fakeModel(claims: (text: string) => Claim[], judge: (text: string) => Judgement = () => ({ relation: "unrelated" })) {
  const calls: ModelRequest[] = [];
  const client: ModelClient = {
    generate: async (req) => {
      calls.push(req);
      const text = req.parts.map((p) => ("text" in p ? p.text : "")).join("\n");
      const isCompare = !!(req.schema as { properties?: Record<string, unknown> })?.properties?.relation;
      return JSON.stringify(isCompare ? { said: null, noted: null, ...judge(text) } : { claims: claims(text) });
    },
  };
  return { client, calls };
}

const fifteenth: Claim = { statement: "The payroll cutoff date for Nike France is the 15th.", category: "payroll" };
const cutoffClaims = (text: string) => (/15th/.test(text) ? [fifteenth] : []);
/** Gemini's view: the draft's 15th contradicts the seeded leaf (the 20th). */
const judge = (text: string): Judgement => (/15th/.test(text) && /Cutoff date for Nike France is the 20th/.test(text) ? { relation: "contradicts", said: "the 15th", noted: "the 20th" } : { relation: "unrelated" });

const lena = () => person("lena")!;

beforeEach(() => resetDb());

describe("checkDraft", () => {
  it("the demo draft to sarah@nike.fr saying the 15th gets one card with the leaf's source and ×5", async () => {
    const { client } = fakeModel(cutoffClaims, judge);
    const thoughts = await checkDraft(lena(), DEMO_DRAFT, { model: client });

    expect(thoughts).toHaveLength(1);
    expect(thoughts[0]).toMatchObject({
      leafId: "sl-fr-1",
      path: ["Nike EMEA", "France"],
      said: "the 15th",
      noted: "the 20th",
      times: 4,
      source: { channel: "mail", from: "Julien Moreau" },
    });
    expect(DEMO_DRAFT.text).toContain(thoughts[0].sentence);
  });

  it("a draft without factual claims shows nothing and never calls the model", async () => {
    const { client, calls } = fakeModel(cutoffClaims, judge);
    const thoughts = await checkDraft(lena(), { to: "sarah@nike.fr", subject: "Hello", text: "Hi Sarah,\n\nThanks for the nice meeting, have a great weekend!\n\nLena" }, { model: client });
    expect(thoughts).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("a claim that agrees with the leaf shows nothing", async () => {
    const twentieth = { statement: "The payroll cutoff date for Nike France is the 20th.", category: "payroll" };
    const { client } = fakeModel(() => [twentieth], () => ({ relation: "same" }));
    const text = DEMO_DRAFT.text.replace("the 15th", "the 20th");
    expect(await checkDraft(lena(), { ...DEMO_DRAFT, text }, { model: client })).toEqual([]);
  });

  it("only uses leaves on customers the user can access", async () => {
    const { client, calls } = fakeModel(cutoffClaims, judge);
    expect(await checkDraft(person("amelie")!, DEMO_DRAFT, { model: client })).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("limits the draft size", () => {
    expect(() => validateDraft({ ...DEMO_DRAFT, text: "x".repeat(MAX_DRAFT_CHARS + 1) })).toThrow(ValidationError);
    expect(() => validateDraft({ to: 42, text: "hi" })).toThrow(ValidationError);
    expect(validateDraft(DEMO_DRAFT)).toEqual(DEMO_DRAFT);
  });
});

describe("rewriteClaim (Change to 20th)", () => {
  const sentence = "Quick reminder for the November run: the cutoff date is the 15th, so please send all variable input before then.";
  it("rewrites the matching text in the draft only", () => {
    const out = rewriteClaim(DEMO_DRAFT.text, { sentence, said: "the 15th", noted: "the 20th" });
    expect(out).toContain("the cutoff date is the 20th, so please");
    expect(out.replace("20th", "15th")).toBe(DEMO_DRAFT.text);
  });
  it("falls back to the bare value when the claim words differ", () => {
    expect(rewriteClaim("Cutoff: 15th.", { sentence: "Cutoff: 15th.", said: "the 15th", noted: "the 20th" })).toBe("Cutoff: 20th.");
  });


});
