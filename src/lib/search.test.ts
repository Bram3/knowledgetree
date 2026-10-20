import "@/test/next-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb, search } from "./db";

beforeEach(() => resetDb());

describe("search", () => {
  it("finds a note by its words", () => {
    expect(search("Nike Deutschland payroll cutoff").length).toBeGreaterThan(0);
  });

  // The query comes straight from the URL (?q=) of the home page.
  it("stays fast on a huge query", () => {
    const q = Array.from({ length: 200_000 }, (_, i) => `w${i}`).join(" ");
    const start = performance.now();
    search(q);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
