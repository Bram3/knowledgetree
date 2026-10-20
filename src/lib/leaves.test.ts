import "@/test/next-mocks";
import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { addLeaves, archivedLeaves, currentLeaves, leafCounts, leavesForNode, leavesFromSource, updateLeaf } from "./leaves";
import { dataDir, getDb, resetDb } from "./db";
import { seed } from "./seed";
import type { Leaf } from "./types";

const leaf = (over: Partial<Leaf>): Leaf => ({
  id: "l-1", nodeId: "nk-de-gmbh", category: "payroll", type: "change", statement: "s", quote: "q", people: [],
  source: { channel: "mail", trigger: "auto", ref: "outlook:e1", at: "2026-10-01T08:00:00.000Z", byId: "lena" },
  confidence: 0.9, status: "auto", reconfirmedAt: [], usefulCount: 0, ...over,
});

beforeEach(() => resetDb());

describe("leaf store", () => {
  const NOW = new Date("2026-10-01T08:00:00.000Z");
  const NONE = { green: 0, yellow: 0, brown: 0 };

  it("counts current leaves per node and category, seeds apart, fallen ones apart", () => {
    addLeaves([
      leaf({ id: "a" }),
      leaf({ id: "b", category: "time" }),
      leaf({ id: "c", status: "fallen" }),
      leaf({ id: "d", nodeId: "nk", status: "seed", category: "other" }),
      leaf({ id: "e", status: "promoted" }),
    ]);
    const counts = leafCounts("nike", NOW);
    expect(counts["nk-de-gmbh"]).toEqual({ total: 2, seeds: 0, fallen: 1, byCategory: { payroll: 1, time: 1 }, seasons: { ...NONE, green: 2 }, categorySeasons: { payroll: { ...NONE, green: 1 }, time: { ...NONE, green: 1 } }, conflicts: 0, categoryConflicts: {} });
    expect(counts["nk"]).toEqual({ total: 1, seeds: 1, fallen: 0, byCategory: {}, seasons: NONE, categorySeasons: {}, conflicts: 0, categoryConflicts: {} });
    expect(counts["nk-be"]).toEqual({ total: 0, seeds: 0, fallen: 0, byCategory: {}, seasons: NONE, categorySeasons: {}, conflicts: 0, categoryConflicts: {} });
    expect(leafCounts("basicfit", NOW)["nk"]).toBeUndefined();
  });

  it("colours the counts by freshness at the given date, and faded leaves fall off the tree", () => {
    // change, half-life 60 days: yellow after 40 days, brown after 90, fallen after 120.
    addLeaves([leaf({ id: "chg" }), leaf({ id: "dec", type: "decision", category: "time" })]);
    const at = (days: number) => leafCounts("nike", new Date(NOW.getTime() + days * 86_400_000))["nk-de-gmbh"];
    expect(at(40).seasons).toEqual({ green: 1, yellow: 1, brown: 0 });
    expect(at(90).categorySeasons.payroll).toEqual({ green: 0, yellow: 0, brown: 1 });
    expect(at(120)).toMatchObject({ total: 1, fallen: 1, byCategory: { time: 1 } });
    expect(at(0)).toMatchObject({ total: 2, fallen: 0 });
  });

  it("splits a node's leaves into the tree and the archive at a date", () => {
    addLeaves([leaf({ id: "chg" }), leaf({ id: "dec", type: "decision" }), leaf({ id: "old", status: "fallen" })]);
    const later = new Date(NOW.getTime() + 120 * 86_400_000);
    expect(currentLeaves("nk-de-gmbh", later).map((l) => l.id)).toEqual(["dec"]);
    expect(archivedLeaves("nk-de-gmbh", later).map((l) => l.id).sort()).toEqual(["chg", "old"]);
    expect(currentLeaves("nk-de-gmbh", NOW).map((l) => l.id).sort()).toEqual(["chg", "dec"]);
  });

  it("lists leaves per node newest first and finds them by source", () => {
    addLeaves([leaf({ id: "old" }), leaf({ id: "new", source: { ...leaf({}).source, at: "2026-10-02T08:00:00.000Z", ref: "outlook:e2" } })]);
    expect(leavesForNode("nk-de-gmbh").map((l) => l.id)).toEqual(["new", "old"]);
    expect(leavesFromSource("mail", "outlook:e2").map((l) => l.id)).toEqual(["new"]);
    expect(leavesFromSource("teams", "outlook:e2")).toEqual([]);
  });

  it("updates a leaf in place", () => {
    addLeaves([leaf({ id: "a" })]);
    expect(updateLeaf("a", (l) => { l.usefulCount++; })?.usefulCount).toBe(1);
    expect(updateLeaf("missing", () => {})).toBeNull();
  });

  it("Reset demo data removes caught leaves", () => {
    addLeaves([leaf({ id: "a" })]);
    resetDb();
    expect(getDb().leaves).toEqual([]);
  });

  it("a db.json written before leaves existed still loads", () => {
    const { leaves: _drop, ...old } = structuredClone(seed);
    void _drop;
    fs.writeFileSync(path.join(dataDir(), "db.json"), JSON.stringify(old));
    globalThis.__ktdb = undefined;
    expect(getDb().leaves).toEqual([]);
    expect(leafCounts("nike", new Date())["nk"].total).toBe(0);
  });
});
