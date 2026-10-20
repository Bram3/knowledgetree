import "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { ingest } from "./ingest";
import { leafCounts, leavesForNode } from "./leaves";
import { getDb, resetDb, person } from "./db";
import type { ModelClient, ModelRequest } from "./gemini";
import { DEMO_MAILS, mailIngestInput } from "./demo-mails";
import { DEMO_TEAMS_MESSAGES, teamsReactionInput } from "./demo-teams";
import { ingestDemoCall } from "./demo-call";

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

/** Gemini's view in the demo: the 20th contradicts Jonas's note (the 15th) and is the same fact as the other 20th leaf. */
const demoJudge = (text: string): Judgement => {
  if (/NOTE "Payroll cutoff Germany: the 15th/.test(text)) return { relation: "contradicts", said: "the 20th", noted: "the 15th" };
  if ((text.match(/20th/g) ?? []).length >= 2) return { relation: "same" };
  return { relation: "unrelated" };
};

const lena = () => person("lena")!;

beforeEach(() => resetDb());

describe("compare at ingest", () => {
  it("a call saying the cutoff moves to the 20th conflicts with Jonas's cutoff note", async () => {
    const { client } = fakeModel([call20], demoJudge);
    const { leaves } = await ingest(lena(), callInput, { model: client });

    expect(leaves).toMatchObject([{ status: "conflict", conflictsWith: "i-nk-de-cutoff-new", conflictClaims: { said: "the 20th", noted: "the 15th" } }]);
    expect(leavesForNode("nk-de-gmbh")).toMatchObject([{ status: "conflict" }]);
  });

  it("the tree counts the open conflict on the node and its category, so it can show it in red", async () => {
    await ingest(lena(), callInput, { model: fakeModel([call20], demoJudge).client });
    const counts = leafCounts("nike", new Date());
    expect(counts["nk-de-gmbh"]).toMatchObject({ conflicts: 1, categoryConflicts: { payroll: 1 } });
    expect(counts["nk-de"]).toMatchObject({ conflicts: 0 });
  });
});

describe("the demo flows work from the committed cache (Vertex down)", () => {
  const down: ModelClient = { generate: async () => { throw new Error("ECONNREFUSED"); } };
  const mailById = (id: string) => mailIngestInput(DEMO_MAILS.find((m) => m.id === id)!);
  const sofie = DEMO_TEAMS_MESSAGES.find((m) => m.id === "m3")!;

  it("Katrin's heads-up mail before the call and Sofie's 🍃 don't conflict with Jonas's note", async () => {
    const mail = await ingest(lena(), mailById("e1"), { model: down });
    const teams = await ingest(lena(), teamsReactionInput(sofie), { model: down });
    expect([...mail.leaves, ...teams.leaves].map((l) => [l.type, l.status])).toEqual([["promise", "auto"], ["risk", "auto"], ["attention", "auto"]]);
  });

  it("opening the heads-up mail and Sofie's 🍃 first doesn't change scene 3: still one conflict, then ×2", async () => {
    await ingest(lena(), mailById("e1"), { model: down });
    await ingest(lena(), teamsReactionInput(sofie), { model: down });
    const call = await ingestDemoCall(lena(), { model: down });
    const change = call.leaves.find((l) => l.type === "change")!;
    expect(call.leaves.filter((l) => l.status === "conflict")).toEqual([change]);
    const confirmation = await ingest(lena(), mailById("e7"), { model: down });
    expect(confirmation.reconfirmed).toMatchObject([{ id: change.id }]);
  });

  it("scene 3: the call's 20th conflicts with Jonas's note, and Katrin's confirmation mail makes it ×2", async () => {
    const call = await ingestDemoCall(lena(), { model: down });
    const change = call.leaves.find((l) => l.type === "change")!;
    expect(change).toMatchObject({ status: "conflict", conflictsWith: "i-nk-de-cutoff-new", conflictClaims: { said: "the 20th", noted: "the 15th" } });
    expect(call.leaves.filter((l) => l.status === "conflict")).toHaveLength(1);

    const mail = await ingest(lena(), mailById("e7"), { model: down });
    expect(mail.leaves).toEqual([]);
    expect(mail.reconfirmed).toMatchObject([{ id: change.id, reconfirmedAt: [expect.any(String)] }]);
  });

  it("Katrin's confirmation of the 20th conflicts with Jonas's note when nothing else was caught yet", async () => {
    const { leaves } = await ingest(lena(), mailById("e7"), { model: down });
    expect(leaves).toMatchObject([{ status: "conflict", conflictsWith: "i-nk-de-cutoff-new", conflictClaims: { said: "the 20th", noted: "the 15th" } }]);
  });
});

describe("reconfirmation", () => {
  it("a later mail from Katrin confirming the 20th shows ×2 on the existing leaf and creates no new one", async () => {
    const [callLeaf] = (await ingest(lena(), callInput, { model: fakeModel([call20], demoJudge).client })).leaves;
    const res = await ingest(lena(), mailInput, { model: fakeModel([mail20], demoJudge).client });

    expect(res.leaves).toEqual([]);
    expect(res.reconfirmed).toMatchObject([{ id: callLeaf.id, reconfirmedAt: [expect.any(String)] }]);
    const onNode = leavesForNode("nk-de-gmbh");
    expect(onNode).toHaveLength(1);
    expect(onNode[0]).toMatchObject({ id: callLeaf.id, reconfirmedBy: [{ channel: "mail", ref: "outlook:e7" }] });
  });

  it("re-opening the confirming mail does not count it twice", async () => {
    await ingest(lena(), callInput, { model: fakeModel([call20], demoJudge).client });
    await ingest(lena(), mailInput, { model: fakeModel([mail20], demoJudge).client });
    const again = fakeModel([mail20], demoJudge);
    const res = await ingest(lena(), mailInput, { model: again.client });

    expect(again.calls).toEqual([]);
    expect(res.reconfirmed).toHaveLength(1);
    expect(leavesForNode("nk-de-gmbh")[0].reconfirmedAt).toHaveLength(1);
  });

  describe("saying the same as a note", () => {
    const MAIL15 = "Hi Lena, just to confirm: the payroll cutoff for Nike Deutschland GmbH stays the 15th. Katrin";
    const mail15 = { ...call20, type: "attention", statement: "The payroll cutoff for Nike Deutschland GmbH stays the 15th.", quote: "the payroll cutoff for Nike Deutschland GmbH stays the 15th" };
    const input15 = { ...mailInput, text: MAIL15, ref: "outlook:e15" };
    const sameAsNote = (text: string): Judgement => (/NOTE "Payroll cutoff Germany: the 15th/.test(text) ? { relation: "same" } : { relation: "unrelated" });
    const note = () => getDb().items.find((i) => i.id === "i-nk-de-cutoff-new")!;

    it("reconfirms the note: no new leaf, the note records who said it again, and Changes shows it", async () => {
      const res = await ingest(lena(), input15, { model: fakeModel([mail15], sameAsNote).client });
      expect(res.leaves).toEqual([]);
      expect(res.reconfirmedNotes).toMatchObject([{ id: "i-nk-de-cutoff-new" }]);
      expect(leavesForNode("nk-de-gmbh")).toEqual([]);
      expect(note().reconfirmedBy).toMatchObject([{ channel: "mail", ref: "outlook:e15", byId: "lena" }]);
      expect(getDb().activity.at(-1)).toMatchObject({ action: "leaf_reconfirmed", itemId: "i-nk-de-cutoff-new", actorId: "lena" });
    });

    it("re-opening the mail does not count it twice", async () => {
      await ingest(lena(), input15, { model: fakeModel([mail15], sameAsNote).client });
      const again = fakeModel([mail15], sameAsNote);
      const res = await ingest(lena(), input15, { model: again.client });
      expect(again.calls).toEqual([]);
      expect(res.reconfirmedNotes).toMatchObject([{ id: "i-nk-de-cutoff-new" }]);
      expect(note().reconfirmedBy).toHaveLength(1);
    });
  });

  it("an unusable comparison answer counts as a new leaf", async () => {
    const garbage: ModelClient = { generate: async (req) => (JSON.stringify(req.schema).includes('"relation"') ? "not json" : JSON.stringify({ leaves: [call20] })) };
    const { leaves } = await ingest(lena(), callInput, { model: garbage });
    expect(leaves).toMatchObject([{ status: "auto" }]);
  });

  it("the conflict and the reconfirmation appear in the Changes feed, with names", async () => {
    await ingest(lena(), callInput, { model: fakeModel([call20], demoJudge).client });
    await ingest(lena(), mailInput, { model: fakeModel([mail20], demoJudge).client });
    const feed = getDb().activity.filter((a) => a.action === "leaf_conflict" || a.action === "leaf_reconfirmed");
    expect(feed).toMatchObject([
      { action: "leaf_conflict", actorId: "lena", itemId: "i-nk-de-cutoff-new", summary: expect.stringMatching(/Katrin Vogel.*Jonas Becker/) },
      { action: "leaf_reconfirmed", actorId: "lena", summary: expect.stringMatching(/Katrin Vogel.*×2/) },
    ]);
  });
});
