import "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { ingest } from "./ingest";
import { leavesForNode } from "./leaves";
import { getDb, resetDb, person } from "./db";
import type { ModelClient, ModelRequest } from "./gemini";

/**
 * COMPARE at ingest: a new leaf is matched against the notes and live leaves on its node › category.
 * The fake model answers extraction requests with `extract` and comparison requests with `judge(request text)`.
 */
type Judgement = { relation: "same" | "contradicts" | "unrelated"; said?: string | null; noted?: string | null };

function fakeModel(extract: unknown[], judge: (text: string) => Judgement = () => ({ relation: "unrelated" })) {
  const calls: ModelRequest[] = [];
  const client: ModelClient = {
    generate: async (req) => {
      calls.push(req);
      const text = req.parts.map((p) => ("text" in p ? p.text : "")).join("\n");
      const isCompare = !!(req.schema as { properties?: Record<string, unknown> })?.properties?.relation;
      return JSON.stringify(isCompare ? { said: null, noted: null, ...judge(text) } : { leaves: extract });
    },
  };
  return { client, calls };
}

const CALL = `Lena: Hi Katrin, how was the weekend?
Katrin: Great, thanks. One thing: from next month the payroll cutoff for Nike Deutschland GmbH moves from the 15th to the 20th.`;

const call20 = {
  type: "change",
  statement: "From next month the payroll cutoff for Nike Deutschland GmbH moves to the 20th.",
  why: null,
  quote: "from next month the payroll cutoff for Nike Deutschland GmbH moves from the 15th to the 20th",
  people: ["Katrin Vogel"],
  confidence: 0.92,
  nodeId: "nk-de-gmbh",
  category: "payroll",
};

const MAIL = `RE: Payroll cutoff Nike Deutschland GmbH

Hi Lena, as discussed on the phone: the cutoff for variable input is the 20th from next month. Pay date stays the 25th.

Katrin`;

const mail20 = { ...call20, statement: "Nike Deutschland GmbH confirms the payroll cutoff is the 20th from next month.", quote: "the cutoff for variable input is the 20th from next month" };

const callInput = { channel: "call" as const, trigger: "auto" as const, text: CALL, ref: "call:katrin-1", from: "Katrin Vogel <katrin.vogel@nike.com>" };
const mailInput = { channel: "mail" as const, trigger: "auto" as const, text: MAIL, ref: "outlook:e7", from: "Katrin Vogel <katrin.vogel@nike.com>" };

/** Gemini's view in the demo: the 20th contradicts Jonas's note (the 18th) and is the same fact as the other 20th leaf. */
const demoJudge = (text: string): Judgement => {
  if (/moves to the 18th/i.test(text)) return { relation: "contradicts", said: "the 20th", noted: "the 18th" };
  if ((text.match(/20th/g) ?? []).length >= 2) return { relation: "same" };
  return { relation: "unrelated" };
};

const lena = () => person("lena")!;

beforeEach(() => resetDb());

describe("compare at ingest", () => {
  it("a call saying the cutoff moves to the 20th conflicts with Jonas's cutoff note", async () => {
    const { client } = fakeModel([call20], demoJudge);
    const { leaves } = await ingest(lena(), callInput, { model: client });

    expect(leaves).toMatchObject([{ status: "conflict", conflictsWith: "i-nk-de-cutoff-new", conflictClaims: { said: "the 20th", noted: "the 18th" } }]);
    expect(leavesForNode("nk-de-gmbh")).toMatchObject([{ status: "conflict" }]);
  });
});
