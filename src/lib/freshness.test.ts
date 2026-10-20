import { describe, expect, it } from "vitest";
import { freshness, season, isCurrent, isArchived, withFreshness } from "./freshness";
import type { Leaf } from "./types";

const CAUGHT = "2026-10-01T08:00:00.000Z";
const leaf = (over: Partial<Leaf> = {}): Leaf => ({
  id: "l-1", nodeId: "nk-de-gmbh", category: "payroll", type: "change", statement: "s", quote: "q", people: [],
  source: { channel: "mail", trigger: "auto", ref: "outlook:e1", at: CAUGHT, byId: "lena" },
  confidence: 0.9, status: "auto", reconfirmedAt: [], usefulCount: 0, ...over,
});
const daysAfter = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000);

describe("freshness", () => {
  it("is 1 when the leaf was just caught", () => {
    expect(freshness(leaf(), new Date(CAUGHT))).toBe(1);
  });

  it("halves after one half-life of its type", () => {
    expect(freshness(leaf({ type: "change" }), daysAfter(CAUGHT, 60))).toBeCloseTo(0.5);
    expect(freshness(leaf({ type: "promise" }), daysAfter(CAUGHT, 14))).toBeCloseTo(0.5);
    expect(freshness(leaf({ type: "attention" }), daysAfter(CAUGHT, 180))).toBeCloseTo(0.5);
    expect(freshness(leaf({ type: "decision" }), daysAfter(CAUGHT, 365))).toBeCloseTo(0.5);
    expect(freshness(leaf({ type: "expertise" }), daysAfter(CAUGHT, 365))).toBeCloseTo(0.5);
    expect(freshness(leaf({ type: "change" }), daysAfter(CAUGHT, 120))).toBeCloseTo(0.25);
  });

  it("restarts the clock at the latest reconfirmation and adds a full half-life per reconfirmation", () => {
    // change: 60 days. Reconfirmed once on day 30: half-life 120, aged 60 days on day 90.
    const once = leaf({ reconfirmedAt: [daysAfter(CAUGHT, 30).toISOString()] });
    expect(freshness(once, daysAfter(CAUGHT, 90))).toBeCloseTo(Math.SQRT1_2);
    // Twice (order in the array does not matter): half-life 180, aged 180 days on day 190.
    const twice = leaf({ reconfirmedAt: [daysAfter(CAUGHT, 10).toISOString(), daysAfter(CAUGHT, 5).toISOString()] });
    expect(freshness(twice, daysAfter(CAUGHT, 190))).toBeCloseTo(0.5);
  });

  it("each useful mark adds half a half-life, so a used leaf fades slower", () => {
    expect(freshness(leaf({ usefulCount: 1 }), daysAfter(CAUGHT, 90))).toBeCloseTo(0.5);
    expect(freshness(leaf({ usefulCount: 2 }), daysAfter(CAUGHT, 120))).toBeCloseTo(0.5);
  });

  it("stays 1 for a moment before the leaf was caught", () => {
    expect(freshness(leaf(), daysAfter(CAUGHT, -10))).toBe(1);
  });

  it("colours green, then yellow, then brown, and falls below 0.3", () => {
    // change, half-life 60: 1.0 / 0.79 (20d) / 0.63 (40d) / 0.5 (60d) / 0.35 (90d) / 0.25 (120d)
    expect(season(leaf(), new Date(CAUGHT))).toBe("green");
    expect(season(leaf(), daysAfter(CAUGHT, 20))).toBe("green");
    expect(season(leaf(), daysAfter(CAUGHT, 40))).toBe("yellow");
    expect(season(leaf(), daysAfter(CAUGHT, 90))).toBe("brown");
    expect(season(leaf(), daysAfter(CAUGHT, 120))).toBe("fallen");
  });

  it("attaches freshness and colour for display", () => {
    expect(withFreshness(leaf(), daysAfter(CAUGHT, 60))).toMatchObject({ id: "l-1", freshness: expect.closeTo(0.5), season: "yellow" });
  });

  it("a leaf marked fallen stays fallen, whatever its age", () => {
    expect(season(leaf({ status: "fallen" }), new Date(CAUGHT))).toBe("fallen");
  });
});

describe("current and archive", () => {
  it("a fresh leaf is current and not archived", () => {
    expect(isCurrent(leaf(), new Date(CAUGHT))).toBe(true);
    expect(isArchived(leaf(), new Date(CAUGHT))).toBe(false);
  });

  it("a leaf that faded below 0.3 leaves the tree for the archive, and comes back when the date moves back", () => {
    const l = leaf();
    expect(isCurrent(l, daysAfter(CAUGHT, 120))).toBe(false);
    expect(isArchived(l, daysAfter(CAUGHT, 120))).toBe(true);
    expect(isCurrent(l, daysAfter(CAUGHT, 1))).toBe(true);
  });

  it("a promoted leaf is neither current nor archived: it became an official note", () => {
    expect(isCurrent(leaf({ status: "promoted" }), new Date(CAUGHT))).toBe(false);
    expect(isArchived(leaf({ status: "promoted" }), daysAfter(CAUGHT, 400))).toBe(false);
  });
});
