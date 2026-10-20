import { describe, expect, it } from "vitest";
import { MAX_MONTHS_AHEAD, parseMonthsAhead, simulatedDate } from "./sim-date";
import { isArchived, isCurrent, season } from "./freshness";
import type { Leaf, LeafType } from "./types";

const TODAY = new Date("2026-10-20T09:00:00.000Z");

describe("simulated date", () => {
  it("is today at 0 months and moves forward by calendar months", () => {
    expect(simulatedDate(TODAY, 0).toISOString()).toBe("2026-10-20T09:00:00.000Z");
    expect(simulatedDate(TODAY, 6).toISOString()).toBe("2027-04-20T09:00:00.000Z");
    expect(simulatedDate(TODAY, 12).toISOString()).toBe("2027-10-20T09:00:00.000Z");
  });

  it("parses the slider value from a cookie or form, clamped to today .. +12 months", () => {
    expect(MAX_MONTHS_AHEAD).toBe(12);
    expect(parseMonthsAhead("6")).toBe(6);
    expect(parseMonthsAhead(3)).toBe(3);
    expect(parseMonthsAhead(undefined)).toBe(0);
    expect(parseMonthsAhead("junk")).toBe(0);
    expect(parseMonthsAhead("-4")).toBe(0);
    expect(parseMonthsAhead("40")).toBe(12);
    expect(parseMonthsAhead("2.7")).toBe(2);
  });
});

describe("scene 4: moving the slider to +6 months", () => {
  const caughtToday = (type: LeafType, over: Partial<Leaf> = {}): Leaf => ({
    id: type, nodeId: "nk-de-gmbh", category: "payroll", type, statement: "s", quote: "q", people: [],
    source: { channel: "mail", trigger: "auto", ref: `outlook:${type}`, at: TODAY.toISOString(), byId: "lena" },
    confidence: 0.9, status: "auto", reconfirmedAt: [], usefulCount: 0, ...over,
  });
  const in6 = simulatedDate(TODAY, 6);

  it("turns unconfirmed leaves yellow or brown and makes some fall", () => {
    expect(season(caughtToday("decision"), in6)).toBe("yellow");
    expect(season(caughtToday("attention"), in6)).toBe("brown");
    expect(season(caughtToday("change"), in6)).toBe("fallen");
    expect(season(caughtToday("promise"), in6)).toBe("fallen");
    expect(isArchived(caughtToday("change"), in6)).toBe(true);
  });

  it("keeps reconfirmed leaves greener", () => {
    const reconfirmed = caughtToday("attention", { reconfirmedAt: [simulatedDate(TODAY, 2).toISOString()] });
    expect(season(reconfirmed, in6)).toBe("green");
  });

  it("resetting the slider restores the current view", () => {
    const l = caughtToday("change");
    expect(isCurrent(l, in6)).toBe(false);
    expect(isCurrent(l, simulatedDate(TODAY, 0))).toBe(true);
    expect(season(l, simulatedDate(TODAY, 0))).toBe("green");
  });
});
