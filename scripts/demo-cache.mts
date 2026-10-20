/**
 * Writes the committed Gemini fallback cache (src/lib/gemini-cache.json) for the demo flows,
 * so the demo works when Vertex is unreachable and every take gives the same result.
 *
 * Run: node scripts/demo-cache.mts   (Node 22.18+ strips the types)
 *
 * Keys must match `cacheKeyFor(purpose, input)` in src/lib/gemini.ts; src/lib/ingest.test.ts checks the demo mails.
 * Entries already in the file are kept, so you can also paste real Vertex answers from data/gemini-cache.json.
 * Later channels add their own entries to RESPONSES below. src/lib/demo-teams.test.ts checks the Teams chat, src/lib/demo-call.test.ts the call.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DEMO_MAILS, mailIngestInput } from "../src/lib/demo-mails.ts";
import { DEMO_TEAMS_MESSAGES } from "../src/lib/demo-teams.ts";
import { compareText, describeLeaf, describeNote } from "../src/lib/compare-prompt.ts";
import { seed } from "../src/lib/seed.ts";

const cacheKeyFor = (purpose: string, input: string) => `${purpose}:${crypto.createHash("sha256").update(input.trim()).digest("hex").slice(0, 32)}`;
const mailText = (id: string) => mailIngestInput(DEMO_MAILS.find((m) => m.id === id)!).text;
const teamsText = (id: string) => DEMO_TEAMS_MESSAGES.find((m) => m.id === id)!.text;
// Demo call (ticket #6): the transcript is keyed on the base64 audio, the leaves on the transcript.
const demoDir = path.join(import.meta.dirname, "../public/demo");
const callAudio = fs.readFileSync(path.join(demoDir, "nike-call.mp3")).toString("base64");
const callTranscript = fs.readFileSync(path.join(demoDir, "nike-call-transcript.txt"), "utf8");

const RESPONSES: { purpose: string; input: string; response: unknown }[] = [
  {
    purpose: "leaves",
    input: mailText("e1"),
    response: { leaves: [
      { type: "change", statement: "From the October run the cutoff for variable input at Nike Deutschland GmbH moves from the 15th to the 18th; pay date stays the 25th.", why: "Nike introduces a new time registration system.", quote: "from the October run the cutoff for variable input moves from the 15th to the 18th of the month, because of our new time registration system", people: ["Katrin Vogel"], confidence: 0.93, nodeId: "nk-de-gmbh", category: "payroll" },
      { type: "risk", statement: "Nike Germany had confusion last year about which payroll calendar version was valid; confirm the current one is on file.", why: null, quote: "We had some confusion last year with different versions floating around.", people: ["Katrin Vogel"], confidence: 0.8, nodeId: "nk-de-gmbh", category: "payroll" },
    ] },
  },
  { purpose: "leaves", input: mailText("e5"), response: { leaves: [] } },
  {
    purpose: "leaves",
    input: mailText("e6"),
    response: { leaves: [
      { type: "risk", statement: "Nike: payslips were late for the second time this quarter; HR Director EMEA wants an explanation before the next steering meeting.", why: null, quote: "This is the second time this quarter that payslips arrive late", people: ["Ingrid Haas"], confidence: 0.86, nodeId: null, category: "payroll" },
    ] },
  },
  { purpose: "leaves", input: mailText("e2"), response: { leaves: [] } },
  {
    purpose: "leaves",
    input: mailText("e3"),
    response: { leaves: [
      { type: "attention", statement: "Two 30% rulings at Nike European HQ Hilversum end in December; check what needs to be done for payroll.", why: null, quote: "Two of our expats' rulings end in December.", people: ["Anouk de Vries"], confidence: 0.8, nodeId: "nk-nl-ehq", category: "payroll" },
    ] },
  },
  {
    purpose: "leaves",
    input: mailText("e4"),
    response: { leaves: [
      { type: "change", statement: "From next month the roster export of Hotel Amsterdam comes from a new planning tool.", why: null, quote: "From next month the roster export from Hotel Amsterdam comes from the new planning tool.", people: ["Joris Bakker"], confidence: 0.9, nodeId: "vv-nl-ams", category: "time" },
      { type: "promise", statement: "Joris Bakker will send the specification of the new roster export next week.", why: null, quote: "Specification attached next week.", people: ["Joris Bakker"], confidence: 0.78, nodeId: "vv-nl-ams", category: "time" },
    ] },
  },
  // Teams chat with Sofie (🍃 reaction, ticket #7)
  { purpose: "leaves", input: teamsText("m1"), response: { leaves: [] } },
  { purpose: "leaves", input: teamsText("m2"), response: { leaves: [] } },
  {
    purpose: "leaves",
    input: teamsText("m3"),
    response: { leaves: [
      { type: "change", statement: "From the October run the payroll cutoff at Nike Deutschland GmbH moves from the 15th to the 18th; pay date stays the 25th.", why: null, quote: "Nike Deutschland GmbH confirmed the payroll cutoff moves to the 18th from the October run (was the 15th). Pay date stays the 25th.", people: ["Sofie De Smet", "Katrin Vogel"], confidence: 0.88, nodeId: "nk-de-gmbh", category: "payroll" },
      { type: "promise", statement: "Katrin Vogel will send the new Nike Germany payroll calendar by mail.", why: null, quote: "Katrin will send the new calendar by mail.", people: ["Katrin Vogel"], confidence: 0.7, nodeId: "nk-de-gmbh", category: "payroll" },
    ] },
  },
  // Demo call Lena ↔ Katrin (ticket #6). Transcript = the script the audio was generated from; small talk gives no leaves.
  { purpose: "transcript", input: callAudio, response: callTranscript.trim() },
  {
    purpose: "leaves",
    input: callTranscript,
    response: { leaves: [
      { type: "change", statement: "From next month the payroll cutoff for Nike Deutschland GmbH moves from the 15th to the 20th.", why: null, quote: "From next month, the payroll cutoff for Nike Deutschland GmbH moves from the fifteenth to the twentieth.", people: ["Katrin Vogel"], confidence: 0.93, nodeId: "nk-de-gmbh", category: "payroll" },
      { type: "attention", statement: "Bonus changes at Nike Deutschland GmbH need approval from the Betriebsrat (works council) first.", why: "German co-determination: the works council must approve bonus changes.", quote: "bonus changes need approval from the Betriebsrat first, our works council.", people: ["Katrin Vogel"], confidence: 0.9, nodeId: "nk-de-gmbh", category: "payroll" },
      { type: "expertise", statement: "Jonas Becker handled the Betriebsrat approval for bonus changes at Nike Deutschland GmbH last year.", why: null, quote: "Jonas handled that approval last year.", people: ["Jonas Becker"], confidence: 0.85, nodeId: "nk-de-gmbh", category: "payroll" },
    ] },
  },
];

// Katrin confirms the 20th by mail (scene 3). Without the call this conflicts with Jonas's note on its own.
const e7Leaf = { type: "change", statement: "From next month the payroll cutoff for variable input at Nike Deutschland GmbH is the 20th; pay date stays the 25th.", why: null, quote: "from next month the payroll cutoff for variable input at Nike Deutschland GmbH is the 20th", people: ["Katrin Vogel"], confidence: 0.92, nodeId: "nk-de-gmbh", category: "payroll" };
RESPONSES.push({ purpose: "leaves", input: mailText("e7"), response: { leaves: [e7Leaf] } });

// COMPARE (ticket #8): one entry per pair, see src/lib/compare-prompt.ts. A key only depends on the two texts,
// so it holds whatever else hangs on the node. Pairs not listed count as "unrelated" when Vertex is down.
// With live Vertex the call transcript (and so its leaf) can differ: use GEMINI_PREFER_CACHE=1 for the demo takes.
type CachedLeaf = { type: string; statement: string; quote: string };
const leafFrom = (input: string, type: string) => (RESPONSES.find((r) => r.purpose === "leaves" && r.input === input)!.response as { leaves: CachedLeaf[] }).leaves.find((l) => l.type === type)!;
const jonasNote = seed.items.find((i) => i.id === "i-nk-de-cutoff-new")!;
const e1Change = { ...leafFrom(mailText("e1"), "change"), channel: "mail", saidBy: "Katrin Vogel" };
const m3Change = { ...leafFrom(teamsText("m3"), "change"), channel: "teams", saidBy: "Sofie De Smet" };
const e7Change = { ...e7Leaf, channel: "mail", saidBy: "Katrin Vogel" };
const callChange = { ...leafFrom(callTranscript, "change"), channel: "call", saidBy: "Katrin Vogel" };
const same = { relation: "same", said: null, noted: null };
const twentieth = { relation: "contradicts", said: "the 20th", noted: "the 18th" };
RESPONSES.push(
  // Katrin's mail and Sofie's message say the same thing (the 18th), in either order: one leaf ×2.
  { purpose: "compare", input: compareText(m3Change, describeLeaf(e1Change)), response: same },
  { purpose: "compare", input: compareText(e1Change, describeLeaf(m3Change)), response: same },
  // Both agree with Jonas's note.
  { purpose: "compare", input: compareText(e1Change, describeNote(jonasNote)), response: same },
  { purpose: "compare", input: compareText(m3Change, describeNote(jonasNote)), response: same },
  // The 20th contradicts Jonas's note (the 18th) and the earlier leaves.
  { purpose: "compare", input: compareText(e7Change, describeNote(jonasNote)), response: twentieth },
  { purpose: "compare", input: compareText(e7Change, describeLeaf(e1Change)), response: twentieth },
  { purpose: "compare", input: compareText(e7Change, describeLeaf(m3Change)), response: twentieth },
  // Scene 3: the call's 20th contradicts Jonas's note → one card for Jonas. Katrin's mail then says the same: ×2.
  { purpose: "compare", input: compareText(callChange, describeNote(jonasNote)), response: twentieth },
  { purpose: "compare", input: compareText(callChange, describeLeaf(e1Change)), response: twentieth },
  { purpose: "compare", input: compareText(callChange, describeLeaf(m3Change)), response: twentieth },
  { purpose: "compare", input: compareText(callChange, describeLeaf(e7Change)), response: same },
  { purpose: "compare", input: compareText(e7Change, describeLeaf(callChange)), response: same },
);

const file = path.join(import.meta.dirname, "../src/lib/gemini-cache.json");
const cache: Record<string, string> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
for (const r of RESPONSES) cache[cacheKeyFor(r.purpose, r.input)] = typeof r.response === "string" ? r.response : JSON.stringify(r.response);
fs.writeFileSync(file, JSON.stringify(cache, null, 2) + "\n");
console.log(`Wrote ${RESPONSES.length} demo responses to ${path.relative(process.cwd(), file)}`);
