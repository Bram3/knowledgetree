import "@/test/next-mocks";
import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { addLeaves, leafCounts, leavesForNode, leavesFromSource, updateLeaf } from "./leaves";
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
  it("counts live leaves per node and category, seeds apart, fallen ones not at all", () => {
    addLeaves([
      leaf({ id: "a" }),
      leaf({ id: "b", category: "time" }),
      leaf({ id: "c", status: "fallen" }),
      leaf({ id: "d", nodeId: "nk", status: "seed", category: "other" }),
    ]);
    const counts = leafCounts("nike");
    expect(counts["nk-de-gmbh"]).toEqual({ total: 2, seeds: 0, byCategory: { payroll: 1, time: 1 } });
    expect(counts["nk"]).toEqual({ total: 1, seeds: 1, byCategory: {} });
    expect(counts["nk-be"]).toEqual({ total: 0, seeds: 0, byCategory: {} });
    expect(leafCounts("basicfit")["nk"]).toBeUndefined();
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
    expect(leafCounts("nike")["nk"].total).toBe(0);
  });
});
