import "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { ingest, IngestRejectedError, MAX_INGEST_CHARS } from "./ingest";
import { leavesForNode } from "./leaves";
import { resetDb, person } from "./db";
import type { ModelClient, ModelRequest } from "./gemini";
import { DEMO_MAILS, mailIngestInput } from "./demo-mails";
import { AccessDeniedError } from "./access";

const NIKE_DE_MAIL = `Updated payroll calendar Q4 2026 – Nike Deutschland GmbH

Hi Lena,

From the October run the cutoff for variable input moves from the 15th to the 18th of the month, because of our new time registration system. Pay date remains the 25th.

Mit freundlichen Grüßen,
Katrin Vogel`;

const mail = (text: string, ref = "outlook:test") => ({ channel: "mail" as const, trigger: "auto" as const, text, ref, from: "Katrin Vogel <katrin.vogel@nike.com>" });

/** A fake Gemini that answers every request with `reply` and records what it was asked. */
function fakeModel(reply: unknown) {
  const calls: ModelRequest[] = [];
  const client: ModelClient = { generate: async (req) => { calls.push(req); return JSON.stringify(reply); } };
  return { client, calls };
}

const cutoffLeaf = {
  type: "change",
  statement: "Nike Deutschland GmbH: cutoff for variable input moves from the 15th to the 18th from the October run.",
  why: "New time registration system.",
  quote: "the cutoff for variable input moves from the 15th to the 18th of the month",
  people: ["Katrin Vogel"],
  confidence: 0.9,
  nodeId: "nk-de-gmbh",
  category: "payroll",
};

const lena = () => person("lena")!;

beforeEach(() => resetDb());

describe("ingest", () => {
  it("a Nike Germany mail grows a leaf on Nike Deutschland GmbH › Payroll", async () => {
    const { client } = fakeModel({ leaves: [cutoffLeaf] });
    const result = await ingest(lena(), mail(NIKE_DE_MAIL), { model: client });

    expect(result.leaves).toHaveLength(1);
    const [leaf] = leavesForNode("nk-de-gmbh");
    expect(leaf).toMatchObject({
      nodeId: "nk-de-gmbh",
      category: "payroll",
      type: "change",
      status: "auto",
      quote: cutoffLeaf.quote,
      confidence: 0.9,
      source: { channel: "mail", trigger: "auto", ref: "outlook:test", byId: "lena", from: "Katrin Vogel <katrin.vogel@nike.com>" },
    });
  });

  it("a mail with only small talk produces no leaves", async () => {
    const { client } = fakeModel({ leaves: [] });
    const result = await ingest(lena(), mail("Hi Lena, thanks for the lovely dinner at the Nike offsite in Germany! Have a great weekend."), { model: client });
    expect(result.leaves).toEqual([]);
    expect(leavesForNode("nk-de-gmbh")).toEqual([]);
  });
});

describe("placement", () => {
  it("when the model is unsure where it belongs, the leaf becomes a seed at the customer root", async () => {
    const { client } = fakeModel({ leaves: [{ ...cutoffLeaf, nodeId: null, category: null }] });
    await ingest(lena(), mail(NIKE_DE_MAIL), { model: client });
    expect(leavesForNode("nk-de-gmbh")).toEqual([]);
    expect(leavesForNode("nk")).toMatchObject([{ status: "seed", nodeId: "nk", quote: cutoffLeaf.quote }]);
  });

  it("a leaf the model can only place on the customer root is a seed too", async () => {
    const text = "Nike: this is the second time the payslips are late. If it happens again we escalate.";
    const { client } = fakeModel({ leaves: [{ ...cutoffLeaf, type: "risk", quote: "this is the second time the payslips are late", nodeId: "nk" }] });
    await ingest(lena(), mail(text), { model: client });
    expect(leavesForNode("nk")).toMatchObject([{ status: "seed", type: "risk" }]);
  });

  it("a node outside the customer is never used: the rule-based detection places it instead", async () => {
    const { client } = fakeModel({ leaves: [{ ...cutoffLeaf, nodeId: "bf-fr" }] });
    await ingest(lena(), mail(NIKE_DE_MAIL), { model: client });
    expect(leavesForNode("bf-fr")).toEqual([]);
    expect(leavesForNode("nk-de-gmbh")).toMatchObject([{ status: "auto" }]);
  });

  it("a node outside the customer with no confident rule-based match becomes a seed", async () => {
    const text = "Nike: this is the second time the payslips are late. If it happens again we escalate.";
    const { client } = fakeModel({ leaves: [{ ...cutoffLeaf, type: "risk", quote: "this is the second time the payslips are late", nodeId: "bf-fr" }] });
    await ingest(lena(), mail(text), { model: client });
    expect(leavesForNode("nk")).toMatchObject([{ status: "seed", type: "risk" }]);
  });

  it("the model only gets this customer's nodes and categories to choose from", async () => {
    const { client, calls } = fakeModel({ leaves: [] });
    await ingest(lena(), mail(NIKE_DE_MAIL), { model: client });
    const props = (calls[0].schema as { properties: { leaves: { items: { properties: Record<string, { enum: unknown[] }> } } } }).properties.leaves.items.properties;
    expect(props.nodeId.enum).toContain("nk-de-gmbh");
    expect(props.nodeId.enum).not.toContain("vv-nl-ams");
    expect(props.category.enum).toEqual(["payroll", "time", "hr-admin", "contract", null]);
  });

  it("an unknown category falls back to one derived from the statement", async () => {
    const { client } = fakeModel({ leaves: [{ ...cutoffLeaf, category: "nonsense" }] });
    await ingest(lena(), mail(NIKE_DE_MAIL), { model: client });
    expect(leavesForNode("nk-de-gmbh")).toMatchObject([{ category: "payroll" }]);
  });
});

describe("guards", () => {
  it("a user can't ingest into a customer they have no access to: nothing is extracted or stored", async () => {
    const { client, calls } = fakeModel({ leaves: [cutoffLeaf] });
    const result = await ingest(person("amelie")!, mail(NIKE_DE_MAIL), { model: client });
    expect(result).toEqual({ leaves: [], reconfirmed: [], companyId: null });
    expect(calls).toHaveLength(0);
    expect(leavesForNode("nk-de-gmbh")).toEqual([]);
  });

  it("a node hint outside the user's customers is refused", async () => {
    const { client, calls } = fakeModel({ leaves: [cutoffLeaf] });
    await expect(ingest(person("amelie")!, { ...mail(NIKE_DE_MAIL), nodeId: "nk-de-gmbh" }, { model: client })).rejects.toBeInstanceOf(AccessDeniedError);
    expect(calls).toHaveLength(0);
  });

  it("a node hint picks the customer when the text alone does not name it", async () => {
    const text = "Reminder: the Betriebsrat must approve bonus changes before we run them.";
    const leaf = { ...cutoffLeaf, type: "attention", quote: "the Betriebsrat must approve bonus changes", nodeId: "nk-de-gmbh" };
    const { leaves } = await ingest(lena(), { ...mail(text), channel: "teams", trigger: "reaction", nodeId: "nk-de" }, { model: fakeModel({ leaves: [leaf] }).client });
    expect(leaves).toMatchObject([{ nodeId: "nk-de-gmbh", source: { channel: "teams", trigger: "reaction" } }]);
  });

  it("input above the size limit, or empty input, is rejected before anything else happens", async () => {
    const { client, calls } = fakeModel({ leaves: [cutoffLeaf] });
    await expect(ingest(lena(), mail(NIKE_DE_MAIL + "x".repeat(MAX_INGEST_CHARS)), { model: client })).rejects.toBeInstanceOf(IngestRejectedError);
    await expect(ingest(lena(), mail("   "), { model: client })).rejects.toBeInstanceOf(IngestRejectedError);
    expect(calls).toHaveLength(0);
  });

  it("a leaf whose quote is not literally in the message is dropped", async () => {
    const { client } = fakeModel({ leaves: [{ ...cutoffLeaf, quote: "the cutoff moves to the 20th" }] });
    expect((await ingest(lena(), mail(NIKE_DE_MAIL), { model: client })).leaves).toEqual([]);
  });

  it("quotes match regardless of whitespace and case", async () => {
    const { client } = fakeModel({ leaves: [{ ...cutoffLeaf, quote: "The cutoff for variable input  moves\nfrom the 15th" }] });
    expect((await ingest(lena(), mail(NIKE_DE_MAIL), { model: client })).leaves).toHaveLength(1);
  });

  it("HR data about individuals is filtered out even if the model returns it", async () => {
    const text = `${NIKE_DE_MAIL}\nPS: Markus from Nike Deutschland GmbH is on sick leave until March, his salary is 5.400 EUR.`;
    const { client } = fakeModel({ leaves: [
      cutoffLeaf,
      { ...cutoffLeaf, type: "attention", statement: "Markus is on sick leave until March.", quote: "Markus from Nike Deutschland GmbH is on sick leave until March" },
      { ...cutoffLeaf, type: "attention", statement: "Markus earns 5.400 EUR.", quote: "his salary is 5.400 EUR" },
    ] });
    const { leaves } = await ingest(lena(), mail(text), { model: client });
    expect(leaves.map((l) => l.quote)).toEqual([cutoffLeaf.quote]);
  });

  it("drops low-confidence leaves; a 🍃 reaction lowers the bar", async () => {
    const unsure = { ...cutoffLeaf, confidence: 0.6 };
    expect((await ingest(lena(), mail(NIKE_DE_MAIL, "outlook:a"), { model: fakeModel({ leaves: [unsure] }).client })).leaves).toEqual([]);
    const reaction = { ...mail(NIKE_DE_MAIL, "teams:b"), channel: "teams" as const, trigger: "reaction" as const };
    expect((await ingest(lena(), reaction, { model: fakeModel({ leaves: [unsure] }).client })).leaves).toHaveLength(1);
  });

  it("keeps at most 3 leaves per message", async () => {
    const { client } = fakeModel({ leaves: [cutoffLeaf, cutoffLeaf, cutoffLeaf, cutoffLeaf] });
    expect((await ingest(lena(), mail(NIKE_DE_MAIL), { model: client })).leaves).toHaveLength(3);
  });

  it("garbage from the model produces no leaves instead of an error", async () => {
    const client: ModelClient = { generate: async () => "not json" };
    expect((await ingest(lena(), mail(NIKE_DE_MAIL), { model: client })).leaves).toEqual([]);
    const { client: wrongShape } = fakeModel({ leaves: [{ type: "gossip", statement: 3, quote: cutoffLeaf.quote, confidence: "high" }] });
    expect((await ingest(lena(), mail(NIKE_DE_MAIL), { model: wrongShape })).leaves).toEqual([]);
  });
});

describe("idempotency", () => {
  it("ingesting the same message twice does not duplicate leaves or call the model again", async () => {
    const { client, calls } = fakeModel({ leaves: [cutoffLeaf] });
    const first = await ingest(lena(), mail(NIKE_DE_MAIL, "outlook:e1"), { model: client });
    const callsAfterFirst = calls.length;
    const again = await ingest(lena(), mail(NIKE_DE_MAIL, "outlook:e1"), { model: client });
    expect(again.leaves.map((l) => l.id)).toEqual(first.leaves.map((l) => l.id));
    expect(leavesForNode("nk-de-gmbh")).toHaveLength(1);
    expect(calls).toHaveLength(callsAfterFirst);
  });
});

describe("when Vertex is unreachable", () => {
  const down: ModelClient = { generate: async () => { throw new Error("ECONNREFUSED"); } };
  const hanging: ModelClient = { generate: (req) => new Promise((_, reject) => req.signal?.addEventListener("abort", () => reject(new Error("aborted")))) };
  const text = `${NIKE_DE_MAIL}\nUnique: cache test`;

  it("the cached response for the same text is used", async () => {
    await ingest(lena(), mail(text, "outlook:first"), { model: fakeModel({ leaves: [cutoffLeaf] }).client });
    resetDb();
    const { leaves } = await ingest(lena(), mail(text, "outlook:first"), { model: down });
    expect(leaves).toMatchObject([{ nodeId: "nk-de-gmbh", quote: cutoffLeaf.quote }]);
  });

  it("a timeout falls back to the cache too", async () => {
    process.env.GEMINI_TIMEOUT_MS = "20";
    try {
      expect((await ingest(lena(), mail(text, "outlook:timeout"), { model: hanging })).leaves).toHaveLength(1);
    } finally {
      delete process.env.GEMINI_TIMEOUT_MS;
    }
  });

  it("without a cached response nothing is stored and nothing throws", async () => {
    expect(await ingest(lena(), mail(`${NIKE_DE_MAIL}\nnever seen before`), { model: down })).toEqual({ leaves: [], reconfirmed: [], companyId: "nike" });
  });

  describe("the demo mails still work from the committed cache", () => {
    const run = (id: string) => ingest(lena(), mailIngestInput(DEMO_MAILS.find((m) => m.id === id)!), { model: down });

    it("the Nike Germany mail grows leaves on Nike Deutschland GmbH › Payroll", async () => {
      const { leaves } = await run("e1");
      expect(leaves.length).toBeGreaterThan(0);
      expect(leaves.filter((l) => l.nodeId === "nk-de-gmbh" && l.category === "payroll" && l.status === "auto").length).toBeGreaterThan(0);
    });

    it("the small-talk mail produces no leaves", async () => {
      expect((await run("e5")).leaves).toEqual([]);
    });

    it("the mail without a clear node produces a seed at the Nike root", async () => {
      expect((await run("e6")).leaves).toMatchObject([{ nodeId: "nk", status: "seed" }]);
    });

    it("the Van der Valk mail lands on Hotel Amsterdam with a change and a promise", async () => {
      expect((await run("e4")).leaves.map((l) => [l.nodeId, l.category, l.type])).toEqual([["vv-nl-ams", "time", "change"], ["vv-nl-ams", "time", "promise"]]);
    });
  });
});
