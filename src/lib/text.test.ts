import { describe, expect, it } from "vitest";
import { stripMarkdown } from "./text";

describe("stripMarkdown", () => {
  it("turns a markdown note into one plain line", () => {
    const md = "# Cutoff\n\n- **20th** of the month\n- see [the calendar](/files/x.pdf)\n1. ask Katrin\n\n| a | b |\n|---|---|\n| 1 | 2 |\n```\ncode\n```";
    expect(stripMarkdown(md)).toBe("Cutoff 20th of the month see the calendar ask Katrin a b 1 2");
  });

  // Notes are user input and every preview runs this on the server: it must stay linear on hostile input.
  it.each([
    ["whitespace-only lines", " \n".repeat(20_000) + "x"],
    ["unclosed links", "[a](".repeat(20_000)],
    ["unclosed brackets", "[".repeat(50_000)],
  ])("handles %s quickly", (_name, input) => {
    const start = performance.now();
    stripMarkdown(input);
    expect(performance.now() - start).toBeLessThan(100);
  });
});
