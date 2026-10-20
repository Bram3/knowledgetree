import { Redirect, signInAs, signOut } from "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { markLeafUseful, setMonthsAhead } from "./season-actions";
import { monthsAhead, now } from "./clock";
import { addLeaves, getLeaf } from "./leaves";
import { AccessDeniedError } from "./access";
import { resetDb } from "./db";
import { freshness } from "./freshness";
import type { Leaf } from "./types";

const leaf = (over: Partial<Leaf>): Leaf => ({
  id: "l-nk", nodeId: "nk-de-gmbh", category: "payroll", type: "change", statement: "s", quote: "q", people: [],
  source: { channel: "mail", trigger: "auto", ref: "outlook:e1", at: new Date().toISOString(), byId: "lena" },
  confidence: 0.9, status: "auto", reconfirmedAt: [], usefulCount: 0, ...over,
});

beforeEach(() => {
  resetDb();
  signOut();
  addLeaves([leaf({}), leaf({ id: "l-bf", nodeId: "bf-fr", source: { ...leaf({}).source, ref: "outlook:bf" } })]);
});

describe("simulated date (time slider)", () => {
  it("is today until the slider moves", async () => {
    await signInAs("tom");
    expect(await monthsAhead()).toBe(0);
    expect(Math.abs((await now()).getTime() - Date.now())).toBeLessThan(5_000);
  });

  it("moving the slider moves now() for every reader, resetting it restores today", async () => {
    await signInAs("tom");
    await setMonthsAhead(6);
    expect(await monthsAhead()).toBe(6);
    const later = await now();
    const expected = new Date();
    expected.setUTCMonth(expected.getUTCMonth() + 6);
    expect(Math.abs(later.getTime() - expected.getTime())).toBeLessThan(5_000);

    await setMonthsAhead(0);
    expect(await monthsAhead()).toBe(0);
  });

  it("clamps untrusted slider values", async () => {
    await signInAs("tom");
    await setMonthsAhead(99 as never);
    expect(await monthsAhead()).toBe(12);
    await setMonthsAhead("nonsense" as never);
    expect(await monthsAhead()).toBe(0);
  });

  it("requires a signed-in user", async () => {
    await expect(setMonthsAhead(3)).rejects.toBeInstanceOf(Redirect);
  });
});

describe("markLeafUseful", () => {
  it("counts as implicit verification and visibly slows the fading", async () => {
    await signInAs("lena");
    const inFourMonths = new Date(Date.now() + 120 * 86_400_000);
    const before = freshness(getLeaf("l-nk")!, inFourMonths);
    await markLeafUseful("l-nk");
    expect(getLeaf("l-nk")!.usefulCount).toBe(1);
    expect(freshness(getLeaf("l-nk")!, inFourMonths)).toBeGreaterThan(before + 0.1);
  });

  it("refuses a leaf of a customer the user can't access, or an unknown leaf", async () => {
    await signInAs("amelie");
    await expect(markLeafUseful("l-nk")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(markLeafUseful("nope")).rejects.toBeInstanceOf(AccessDeniedError);
    expect(getLeaf("l-nk")!.usefulCount).toBe(0);
    await markLeafUseful("l-bf");
    expect(getLeaf("l-bf")!.usefulCount).toBe(1);
  });

  it("requires a signed-in user", async () => {
    await expect(markLeafUseful("l-nk")).rejects.toBeInstanceOf(Redirect);
  });
});
