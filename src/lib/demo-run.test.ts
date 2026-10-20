import { signInAs, signOut } from "@/test/next-mocks";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resetDemo } from "./actions";
import { answerConflict, conflictCards, endDemoCall, ingestText } from "./leaf-actions";
import { setMonthsAhead } from "./season-actions";
import { handOverKnowledge, markRoleChanged } from "./handover-actions";
import { customerRisk, handoverBrief, orphanedKnowledge, successorCandidates, holdingsLabel } from "./handover";
import { leafCounts, type LeafCount } from "./leaves";
import { getDb, person } from "./db";
import { now } from "./clock";
import { DEMO_MAILS, mailIngestInput } from "./demo-mails";
import { DEMO_TEAMS_MESSAGES, teamsReactionInput } from "./demo-teams";

/**
 * Ticket #14: the whole demo (scenes 0–6 of the demo script) through the same server actions the UI calls,
 * starting from "Reset demo data", with Vertex unreachable. Two runs in a row must give identical results.
 */

// Vertex unreachable: without GOOGLE_CLOUD_PROJECT the Vertex client refuses before any network call, so every
// answer has to come from the committed cache (src/lib/gemini-cache.json). Lookups it can't answer are recorded.
delete process.env.GOOGLE_CLOUD_PROJECT;
delete process.env.GEMINI_PREFER_CACHE;
const { cacheMisses } = vi.hoisted(() => ({ cacheMisses: new Set<string>() }));
vi.mock("./gemini-cache.json", async (importOriginal) => {
  const cache = ((await importOriginal()) as { default: Record<string, string> }).default;
  const watched = new Proxy(cache, {
    get: (target, key) => {
      if (typeof key === "string" && !(key in target)) cacheMisses.add(key);
      return target[key as string];
    },
  });
  return { default: watched };
});

// The recording day. Both runs start at the same moment with the same random ids, so any difference is a real one.
const RECORDING = new Date("2026-10-20T09:30:00Z");
function seededRandom(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
}

const mail = (id: string) => DEMO_MAILS.find((m) => m.id === id)!;
const message = (id: string) => DEMO_TEAMS_MESSAGES.find((m) => m.id === id)!;

type Seasons = { green: number; yellow: number; brown: number; fallen: number };
function seasonsOf(counts: Record<string, LeafCount>): Seasons {
  const s: Seasons = { green: 0, yellow: 0, brown: 0, fallen: 0 };
  for (const c of Object.values(counts)) {
    s.green += c.seasons.green;
    s.yellow += c.seasons.yellow;
    s.brown += c.seasons.brown;
    s.fallen += c.fallen;
  }
  return s;
}

async function tree() {
  const at = await now();
  const counts = leafCounts("nike", at);
  return { at: at.toISOString(), counts, seasons: seasonsOf(counts), risk: customerRisk("nike", at) };
}

/** Scenes 0–6 as the presenter clicks them, signed in as Lena. Returns everything the screens show. */
async function runDemo() {
  vi.setSystemTime(RECORDING);
  vi.spyOn(Math, "random").mockImplementation(seededRandom(14));
  await signInAs("lena");
  await resetDemo();
  await setMonthsAhead(0);

  // 0: the Nike EMEA tree
  const scene0 = await tree();

  // 1: the call with Katrin, hang up → three leaves
  const call = await endDemoCall();

  // 2: 🍃 on Sofie's message
  const teams = await ingestText(teamsReactionInput(message("m3")));

  // 3: Jonas's card → Correct → note v3; Katrin's mail → ×2
  const cards = await conflictCards("jonas");
  const corrected = await answerConflict(cards[0].leaf.id, "correct", "jonas");
  const note = structuredClone(getDb().items.find((i) => i.id === cards[0].note.id)!);
  const confirmation = await ingestText(mailIngestInput(mail("e7")));

  // 4: slider to +6 months, then back to today
  await setMonthsAhead(6);
  const scene4 = await tree();
  await setMonthsAhead(0);

  // 5: Jonas changes role → Lena takes over → handover brief
  const riskBefore = customerRisk("nike", await now());
  await markRoleChanged("jonas", "nike");
  const orphaned = orphanedKnowledge("nike").map((h) => ({ personId: h.personId, label: holdingsLabel(h) }));
  const successors = successorCandidates("jonas", "nike");
  const { handoverId } = await handOverKnowledge({ companyId: "nike", fromId: "jonas", toId: successors[0].personId });
  const brief = handoverBrief(person("lena")!, handoverId, await now());

  // 6: the tree
  const scene6 = await tree();

  vi.mocked(Math.random).mockRestore();
  return {
    scene0,
    scene1: call,
    scene2: teams,
    scene3: { cards, corrected, note, confirmation },
    scene4,
    scene5: { riskBefore, orphaned, successors, brief },
    scene6,
    db: structuredClone(getDb()),
  };
}

let first: Awaited<ReturnType<typeof runDemo>>;
let second: Awaited<ReturnType<typeof runDemo>>;
beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  first = await runDemo();
  second = await runDemo();
});

afterAll(() => {
  vi.useRealTimers();
  signOut();
});

describe("demo run from Reset demo data (scenes 0–6)", () => {
  it("gives identical results twice in a row", () => {
    expect(second).toEqual(first);
  });

  it("runs entirely on the committed Gemini cache while Vertex is unreachable", () => {
    expect([...cacheMisses]).toEqual([]);
  });

  it("scene 0: the tree starts all green, with Jonas carrying Germany", () => {
    expect(first.scene0.seasons).toMatchObject({ yellow: 0, brown: 0, fallen: 0 });
    expect(first.scene0.risk).toMatchObject({ nodeId: "nk-de", personId: "jonas" });
  });

  it("scene 1: the call catches a change, an attention point and expertise on Nike Deutschland GmbH › Payroll", () => {
    const leaves = first.scene1.leaves;
    expect(leaves.map((l) => l.type).sort()).toEqual(["attention", "change", "expertise"]);
    expect(leaves.every((l) => l.nodeId === "nk-de-gmbh" && l.category === "payroll")).toBe(true);
    expect(leaves.find((l) => l.type === "change")).toMatchObject({ status: "conflict", conflictClaims: { said: "the 20th", noted: "the 15th" } });
  });

  it("scene 2: the 🍃 on Sofie's message gives one attention point", () => {
    expect(first.scene2.leaves).toHaveLength(1);
    expect(first.scene2.leaves[0]).toMatchObject({ type: "attention", nodeId: "nk-de-gmbh", source: { channel: "teams", from: "Sofie De Smet" } });
  });

  it("scene 3: Jonas gets one card, Correct makes his note v3 (the 20th), Katrin's mail makes it ×2", () => {
    const { cards, corrected, note, confirmation } = first.scene3;
    expect(cards.map((c) => c.text)).toEqual(["Katrin said the 20th, your note says the 15th."]);
    expect(cards[0].note).toMatchObject({ id: "i-nk-de-cutoff-new", version: 2 });
    expect(corrected.status).toBe("verified");
    expect(note.versions).toHaveLength(3);
    expect(note.title).toBe("Payroll cutoff Germany: the 20th of the month");
    expect(confirmation.leaves).toEqual([]);
    expect(confirmation.reconfirmed).toHaveLength(1);
    expect(confirmation.reconfirmed[0]).toMatchObject({ id: corrected.id, reconfirmedAt: [expect.any(String)] });
  });

  it("scene 4: at +6 months leaves are yellow, brown and fallen", () => {
    const s = first.scene4.seasons;
    expect(s.yellow).toBeGreaterThan(0);
    expect(s.brown).toBeGreaterThan(0);
    expect(s.fallen).toBeGreaterThan(0);
  });

  it("scene 5: knowledge risk reads 62% from Jonas for Germany, and Lena is the suggested successor", () => {
    const { riskBefore, orphaned, successors, brief } = first.scene5;
    expect(riskBefore).toMatchObject({ nodeId: "nk-de", personId: "jonas", percent: 62 });
    expect(orphaned).toEqual([{ personId: "jonas", label: "15 leaves and 4 items" }]);
    expect(successors[0].personId).toBe("lena");
    expect(brief.toName).toBe("Lena Vermeulen");
    expect(brief.facts.map((f) => f.text)).toContain("Payroll cutoff Germany: the 20th of the month");
  });

  it("scene 6: back at today the whole tree is green", () => {
    const s = first.scene6.seasons;
    expect(s).toMatchObject({ yellow: 0, brown: 0, fallen: 0 });
    expect(s.green).toBeGreaterThan(20);
  });
});
