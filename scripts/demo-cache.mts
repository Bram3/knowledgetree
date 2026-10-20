/**
 * Writes the committed Gemini fallback cache (src/lib/gemini-cache.json) for the demo flows,
 * so the demo works when Vertex is unreachable and every take gives the same result.
 *
 * Run: node scripts/demo-cache.mts   (Node 22.18+ strips the types)
 *
 * The file is rebuilt from RESPONSES below, so stale demo answers don't linger. To keep a real Vertex answer
 * (from data/gemini-cache.json), add it to RESPONSES.
 * Keys must match `cacheKeyFor(purpose, input)` in src/lib/gemini.ts. src/lib/demo-run.test.ts runs the whole demo
 * (scenes 0–6) and fails on any cache miss; ingest.test.ts, demo-teams.test.ts and demo-call.test.ts check the channels.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";

// The app imports its own modules without extension ("./seed-leaves"); let Node find the .ts file.
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith(".") && !path.extname(specifier)) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});
const { DEMO_MAILS, mailIngestInput } = await import("../src/lib/demo-mails.ts");
const { DEMO_TEAMS_MESSAGES } = await import("../src/lib/demo-teams.ts");
const { compareText, correctedNote, describeLeaf, describeNote } = await import("../src/lib/compare-prompt.ts");
const { seed } = await import("../src/lib/seed.ts");

const cacheKeyFor = (purpose: string, input: string) => `${purpose}:${crypto.createHash("sha256").update(input.trim()).digest("hex").slice(0, 32)}`;
const mailText = (id: string) => mailIngestInput(DEMO_MAILS.find((m) => m.id === id)!).text;
const teamsText = (id: string) => DEMO_TEAMS_MESSAGES.find((m) => m.id === id)!.text;
// Demo call (ticket #6): leaves keyed on the shipped transcript. Transcripts themselves are never cached: without
// Vertex the call falls back to this file (src/lib/demo-call.ts).
const demoDir = path.join(import.meta.dirname, "../public/demo");
const callTranscript = fs.readFileSync(path.join(demoDir, "nike-call-transcript.txt"), "utf8");

type CachedLeaf = { type: string; statement: string; why: string | null; quote: string; people: string[]; confidence: number; nodeId: string | null; category: string };
const RESPONSES: { purpose: string; input: string; response: unknown }[] = [];

// ---------- EXTRACT: leaves per demo input, with who said it (the "said by" of a compare pair) ----------
const sources: { input: string; channel: string; saidBy: string; leaves: CachedLeaf[] }[] = [];
const leavesFor = (input: string, channel: string, saidBy: string, leaves: CachedLeaf[]) => {
  sources.push({ input, channel, saidBy, leaves });
  RESPONSES.push({ purpose: "leaves", input, response: { leaves } });
};

// Lena's inbox
leavesFor(mailText("e7"), "mail", "Katrin Vogel", [
  // Scene 3: Katrin confirms the 20th the day after the call → ×2 on the call's leaf.
  { type: "change", statement: "From next month the payroll cutoff for variable input at Nike Deutschland GmbH is the 20th; pay date stays the 25th.", why: null, quote: "from next month the payroll cutoff for variable input at Nike Deutschland GmbH is the 20th", people: ["Katrin Vogel"], confidence: 0.92, nodeId: "nk-de-gmbh", category: "payroll" },
]);
leavesFor(mailText("e1"), "mail", "Katrin Vogel", [
  { type: "promise", statement: "Katrin Vogel will call Lena this week to agree on the new payroll cutoff for Nike Deutschland GmbH.", why: "The new time registration system moves the cutoff later in the month.", quote: "I will call you this week to agree on the new date before anything changes.", people: ["Katrin Vogel"], confidence: 0.84, nodeId: "nk-de-gmbh", category: "payroll" },
  { type: "risk", statement: "Nike Germany had confusion last year about which payroll calendar version was valid; work only from the latest one.", why: null, quote: "We had some confusion last year with different versions floating around.", people: ["Katrin Vogel"], confidence: 0.8, nodeId: "nk-de-gmbh", category: "payroll" },
]);
leavesFor(mailText("e5"), "mail", "Katrin Vogel", []);
leavesFor(mailText("e6"), "mail", "Ingrid Haas", [
  { type: "risk", statement: "Nike: payslips were late for the second time this quarter; HR Director EMEA wants an explanation before the next steering meeting.", why: null, quote: "This is the second time this quarter that payslips arrive late", people: ["Ingrid Haas"], confidence: 0.86, nodeId: null, category: "payroll" },
]);
leavesFor(mailText("e2"), "mail", "Marta Kowalski", []);
leavesFor(mailText("e3"), "mail", "Anouk de Vries", [
  { type: "attention", statement: "Two 30% rulings at Nike European HQ Hilversum end in December; check what needs to be done for payroll.", why: null, quote: "Two of our expats' rulings end in December.", people: ["Anouk de Vries"], confidence: 0.8, nodeId: "nk-nl-ehq", category: "payroll" },
]);
leavesFor(mailText("e4"), "mail", "Joris Bakker", [
  { type: "change", statement: "From next month the roster export of Hotel Amsterdam comes from a new planning tool.", why: null, quote: "From next month the roster export from Hotel Amsterdam comes from the new planning tool.", people: ["Joris Bakker"], confidence: 0.9, nodeId: "vv-nl-ams", category: "time" },
  { type: "promise", statement: "Joris Bakker will send the specification of the new roster export next week.", why: null, quote: "Specification attached next week.", people: ["Joris Bakker"], confidence: 0.78, nodeId: "vv-nl-ams", category: "time" },
]);

// Teams chat with Sofie (🍃 reaction, ticket #7). Scene 2: m3 is a useful attention point for the new time system.
leavesFor(teamsText("m1"), "teams", "Sofie De Smet", []);
leavesFor(teamsText("m2"), "teams", "Lena Vermeulen", []);
leavesFor(teamsText("m3"), "teams", "Sofie De Smet", [
  { type: "attention", statement: "Nike Deutschland GmbH sends overtime in a separate export from the hours file: load both before the cutoff, or overtime is missing from the payroll run.", why: "Since the switch to the new time registration system.", quote: "Always load both files before the cutoff, otherwise the overtime is missing from the payroll run.", people: ["Sofie De Smet"], confidence: 0.82, nodeId: "nk-de-gmbh", category: "payroll" },
]);

// Demo call Lena ↔ Katrin (ticket #6). Transcript = the script the audio was generated from; small talk gives no leaves.
leavesFor(callTranscript, "call", "Katrin Vogel", [
  { type: "change", statement: "From next month the payroll cutoff for Nike Deutschland GmbH moves from the 15th to the 20th.", why: null, quote: "From next month, the payroll cutoff for Nike Deutschland GmbH moves from the fifteenth to the twentieth.", people: ["Katrin Vogel"], confidence: 0.93, nodeId: "nk-de-gmbh", category: "payroll" },
  { type: "attention", statement: "Bonus changes at Nike Deutschland GmbH need approval from the Betriebsrat (works council) first.", why: "German co-determination: the works council must approve bonus changes.", quote: "bonus changes need approval from the Betriebsrat first, our works council.", people: ["Katrin Vogel"], confidence: 0.9, nodeId: "nk-de-gmbh", category: "payroll" },
  { type: "expertise", statement: "Jonas Becker handled the Betriebsrat approval for bonus changes at Nike Deutschland GmbH last year.", why: null, quote: "Jonas handled that approval last year.", people: ["Jonas Becker"], confidence: 0.85, nodeId: "nk-de-gmbh", category: "payroll" },
]);

// ---------- COMPARE (ticket #8): one entry per pair, see src/lib/compare-prompt.ts ----------
// Every placed demo leaf is paired with everything it can meet on its node › category, in any order the presenter
// might open things: the seeded notes and leaves, the other demo leaves, and Jonas's note after "Correct" (v3).
// A key only depends on the two texts. Pairs are "unrelated" unless listed in VERDICTS.
type Side = { statement: string; quote: string };
type DemoLeaf = CachedLeaf & { channel: string; saidBy: string; input: string };
const demoLeaves: DemoLeaf[] = sources.flatMap((s) => s.leaves.filter((l) => l.nodeId).map((l) => ({ ...l, channel: s.channel, saidBy: s.saidBy, input: s.input })));
const leaf = (input: string, type: string) => demoLeaves.find((l) => l.input === input && l.type === type)!;
const callChange = leaf(callTranscript, "change");
const e7Change = leaf(mailText("e7"), "change");

const jonasNote = seed.items.find((i) => i.id === "i-nk-de-cutoff-new")!;
const fifteenth = { said: "the 20th", noted: "the 15th" };
// Jonas's note after he taps Correct on the conflict from the call (the demo) or from Katrin's mail (mail first).
const correctedBy = (l: DemoLeaf) => ({ ...jonasNote, ...correctedNote(jonasNote, l, fifteenth) });
const notesOn = (l: DemoLeaf) => [
  ...seed.items.filter((i) => i.kind === "note" && i.status === "active" && i.nodeId === l.nodeId && i.category === l.category),
  ...(l.nodeId === jonasNote.nodeId && l.category === jonasNote.category ? [correctedBy(callChange), correctedBy(e7Change)] : []),
];
const leavesOn = (l: DemoLeaf): Side[] => [
  ...seed.leaves.filter((s) => s.nodeId === l.nodeId && s.category === l.category),
  ...demoLeaves.filter((o) => o.input !== l.input && o.nodeId === l.nodeId && o.category === l.category),
];

const same = { relation: "same", said: null, noted: null };
const contradicts = { relation: "contradicts", ...fifteenth };
const unrelated = { relation: "unrelated", said: null, noted: null };
const isJonasNote = (title: string) => title === jonasNote.title;
const isCorrected = (title: string) => title === correctedBy(callChange).title;
const isTwentieth = (s: Side) => s === callChange || s === e7Change;

/** Gemini's view in the demo: the 20th contradicts Jonas's note (the 15th), and is the same fact as the other 20th. */
function verdict(l: DemoLeaf, existing: { note?: { title: string }; leaf?: Side }) {
  if (!isTwentieth(l)) return unrelated;
  if (existing.note) return isJonasNote(existing.note.title) ? contradicts : isCorrected(existing.note.title) ? same : unrelated;
  return existing.leaf && isTwentieth(existing.leaf) ? same : unrelated;
}

for (const l of demoLeaves) {
  for (const n of notesOn(l)) RESPONSES.push({ purpose: "compare", input: compareText(l, describeNote(n)), response: verdict(l, { note: n }) });
  for (const o of leavesOn(l)) RESPONSES.push({ purpose: "compare", input: compareText(l, describeLeaf(o)), response: verdict(l, { leaf: o }) });
}

// ---------- SECOND THOUGHT (#19, scene 2b): Lena's draft to sarah@nike.fr says the cutoff is the 15th ----------
// Claims are extracted per sentence with a number (draftSentences), then compared with the France leaf (the 20th).
// "Change to 20th" rewrites the sentence; the rewritten draft agrees with the leaf, so it is cached too.
const { DEMO_DRAFT } = await import("../src/lib/demo-draft.ts");
const { claimsText, draftSentences } = await import("../src/lib/second-thought-prompt.ts");
const franceLeaf = seed.leaves.find((l) => l.id === "sl-fr-1")!;
const draftSentence = draftSentences(DEMO_DRAFT.text)[0];
for (const [said, relation] of [["the 15th", contradicts], ["the 20th", same]] as const) {
  const sentence = draftSentence.replace("the 15th", said);
  const statement = `The payroll cutoff date for Nike France is ${said}.`;
  RESPONSES.push({ purpose: "claims", input: claimsText("Nike EMEA › France", sentence), response: { claims: [{ statement, category: "payroll" }] } });
  const response = relation === contradicts ? { relation: "contradicts", said: "the 15th", noted: "the 20th" } : relation;
  RESPONSES.push({ purpose: "compare", input: compareText({ channel: "mail", saidBy: "Lena Vermeulen", statement, quote: sentence }, describeLeaf(franceLeaf)), response });
}

const file = path.join(import.meta.dirname, "../src/lib/gemini-cache.json");
const cache: Record<string, string> = {};
for (const r of RESPONSES) cache[cacheKeyFor(r.purpose, r.input)] = typeof r.response === "string" ? r.response : JSON.stringify(r.response);
fs.writeFileSync(file, JSON.stringify(cache, null, 2) + "\n");
console.log(`Wrote ${Object.keys(cache).length} demo responses to ${path.relative(process.cwd(), file)}`);
