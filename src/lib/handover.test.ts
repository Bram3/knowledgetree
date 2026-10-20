import "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb, person, recentActivity, resetDb } from "./db";
import { customerRisk, handOver, handoverBrief, holdings, leafOwnerId, markRoleChange, orphanedKnowledge, successorCandidates } from "./handover";
import { addLeaves, getLeaf } from "./leaves";
import { AccessDeniedError } from "./access";

const p = (id: string) => person(id)!;
const NOW = new Date(); // seeded leaves are aged relative to the reset (seed-leaves.ts)

beforeEach(() => resetDb());

describe("knowledge risk", () => {
  it("Nike: before the demo, 72% of what we know about Germany comes from Jonas (62% once the demo adds Lena's leaves, see demo-run.test)", () => {
    expect(customerRisk("nike", NOW)).toMatchObject({ nodeId: "nk-de", nodeName: "Germany", personId: "jonas", percent: 72 });
  });

  it("only current knowledge counts: a fallen leaf from Jonas doesn't raise it", () => {
    addLeaves([{ ...getLeaf("sl-jb-1")!, id: "old-promise", type: "promise", source: { ...getLeaf("sl-jb-1")!.source, at: "2026-01-01T10:00:00Z" } }]);
    expect(customerRisk("nike", NOW)?.percent).toBe(72);
  });
});

describe("role change", () => {
  it("marking Jonas as changed role shows what only he holds on Nike", () => {
    expect(orphanedKnowledge("nike")).toEqual([]);
    markRoleChange(p("marta"), "jonas", "nike");
    const [o] = orphanedKnowledge("nike");
    expect(o.personId).toBe("jonas");
    expect(o.leafIds).toHaveLength(15);
    expect(o.itemIds.sort()).toEqual(["i-nk-de-cutoff-new", "i-nk-de-lohnsteuer", "i-nk-de-retail", "i-nk-de-time"]);
  });

  it("only someone on the same customer can mark a colleague", () => {
    expect(() => markRoleChange(p("amelie"), "jonas", "nike")).toThrow(AccessDeniedError);
    expect(() => markRoleChange(p("lena"), "amelie", "nike")).toThrow(AccessDeniedError);
  });
});

describe("successor", () => {
  it("suggests Lena for Jonas' Nike knowledge, from her contributions to Germany", () => {
    markRoleChange(p("marta"), "jonas", "nike");
    const [first, ...rest] = successorCandidates("jonas", "nike");
    expect(first).toMatchObject({ personId: "lena", contributions: 6 });
    expect(rest.map((c) => c.personId)).toContain("sofie");
  });

  it("only people with Nike access who are still on the team can be chosen", () => {
    markRoleChange(p("marta"), "jonas", "nike");
    markRoleChange(p("marta"), "sofie", "nike");
    const ids = successorCandidates("jonas", "nike").map((c) => c.personId);
    // not amelie or pieter (no Nike access), not jonas, not sofie (also left)
    expect(ids.sort()).toEqual(["lena", "marta", "tom"]);
  });
});

describe("handover", () => {
  const jonasNike = () => holdings("jonas", "nike");

  it("one click moves Jonas' Nike leaves and items to Lena and logs it in Changes", () => {
    markRoleChange(p("marta"), "jonas", "nike");
    const { leafIds, itemIds } = jonasNike();
    const h = handOver(p("marta"), { companyId: "nike", fromId: "jonas", toId: "lena" });

    expect(h).toMatchObject({ companyId: "nike", fromId: "jonas", toId: "lena", byId: "marta", leafIds, itemIds });
    for (const id of leafIds) expect(leafOwnerId(getLeaf(id)!)).toBe("lena");
    for (const id of itemIds) expect(getDb().items.find((i) => i.id === id)?.ownerId).toBe("lena");
    expect(orphanedKnowledge("nike")).toEqual([]);
    expect(getDb().items.find((i) => i.id === "i-am-de-kurzarbeit")?.ownerId).toBe("jonas"); // other customers stay

    const [latest] = recentActivity(1, { companyId: "nike" });
    expect(latest).toMatchObject({ action: "handed_over", actorId: "marta" });
    expect(latest.summary).toBe("handed over 15 leaves and 4 items from Jonas Becker to Lena Vermeulen");
  });

  it("someone without Nike access can't be chosen, and nothing moves", () => {
    markRoleChange(p("marta"), "jonas", "nike");
    const before = jonasNike();
    expect(() => handOver(p("marta"), { companyId: "nike", fromId: "jonas", toId: "amelie" })).toThrow(AccessDeniedError);
    expect(jonasNike()).toEqual(before);
  });

  it("a successor who left themselves can't be chosen", () => {
    markRoleChange(p("marta"), "jonas", "nike");
    markRoleChange(p("marta"), "sofie", "nike");
    expect(() => handOver(p("marta"), { companyId: "nike", fromId: "jonas", toId: "sofie" })).toThrow(AccessDeniedError);
  });

  it("only someone on the customer can hand over", () => {
    markRoleChange(p("marta"), "jonas", "nike");
    expect(() => handOver(p("amelie"), { companyId: "nike", fromId: "jonas", toId: "lena" })).toThrow(AccessDeniedError);
  });
});

describe("handover brief", () => {
  const handToLena = () => {
    markRoleChange(p("marta"), "jonas", "nike");
    return handOver(p("marta"), { companyId: "nike", fromId: "jonas", toId: "lena" });
  };

  it("opens with key facts, attention points and people to call, each with its source", () => {
    const h = handToLena();
    const b = handoverBrief(p("lena"), h.id, NOW);
    expect(b).toMatchObject({ companyName: "Nike EMEA", fromName: "Jonas Becker", toName: "Lena Vermeulen" });
    expect(b.facts.map((f) => f.text)).toContain("Payroll cutoff Germany: the 15th of the month");
    expect(b.facts.map((f) => f.text)).toContain("Agreed: SDWorx does a dry run of the first payroll on the new time registration export.");
    expect(b.attention.map((f) => f.text)).toContain("The works council (Betriebsrat) must approve every change to shift patterns before payroll applies it.");
    expect(b.people.map((f) => f.text)).toEqual(expect.arrayContaining([expect.stringContaining("Katrin Vogel"), expect.stringContaining("Jonas Becker")]));
    const all = [...b.facts, ...b.conflicts, ...b.attention, ...b.people];
    for (const point of all) {
      expect(point.source.label).toBeTruthy();
      expect(point.source.href).toMatch(/^\/customers\/nike/);
    }
    const dryRun = b.facts.find((f) => f.text.startsWith("Agreed: SDWorx does a dry run"))!;
    expect(dryRun.source.quote).toBe("we do a dry run on the new export before the first payroll");
  });

  it("lists open conflicts on the handed-over notes, also when someone else caught the leaf", () => {
    // One of Lena's leaves, so it isn't handed over itself: only the note it contradicts is.
    addLeaves([{ ...getLeaf("sl-lv-6")!, id: "x-conflict", nodeId: "nk-de-gmbh", statement: "The cutoff moves to the 20th.", quote: "the cutoff moves to the 20th", status: "conflict", conflictsWith: "i-nk-de-cutoff-new" }]);
    const b = handoverBrief(p("lena"), handToLena().id, NOW);
    expect(b.conflicts).toHaveLength(1);
    expect(b.conflicts[0].text).toContain("The cutoff moves to the 20th.");
    expect(b.conflicts[0].text).toContain("Payroll cutoff Germany: the 15th of the month");
  });

  it("only people on the customer can open it", () => {
    const h = handToLena();
    expect(() => handoverBrief(p("amelie"), h.id, NOW)).toThrow(AccessDeniedError);
    expect(() => handoverBrief(p("lena"), "h-unknown", NOW)).toThrow(AccessDeniedError);
  });
});
