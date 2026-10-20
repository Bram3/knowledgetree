/**
 * Writes the committed Gemini fallback cache (src/lib/gemini-cache.json) for the demo flows,
 * so the demo works when Vertex is unreachable and every take gives the same result.
 *
 * Run: node scripts/demo-cache.mts   (Node 22.18+ strips the types)
 *
 * Keys must match `cacheKeyFor(purpose, input)` in src/lib/gemini.ts; src/lib/ingest.test.ts checks the demo mails.
 * Entries already in the file are kept, so you can also paste real Vertex answers from data/gemini-cache.json.
 * Later channels (call, ...) add their own entries to RESPONSES below. src/lib/demo-teams.test.ts checks the Teams chat.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DEMO_MAILS, mailIngestInput } from "../src/lib/demo-mails.ts";
import { DEMO_TEAMS_MESSAGES } from "../src/lib/demo-teams.ts";

const cacheKeyFor = (purpose: string, input: string) => `${purpose}:${crypto.createHash("sha256").update(input.trim()).digest("hex").slice(0, 32)}`;
const mailText = (id: string) => mailIngestInput(DEMO_MAILS.find((m) => m.id === id)!).text;
const teamsText = (id: string) => DEMO_TEAMS_MESSAGES.find((m) => m.id === id)!.text;

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
];

const file = path.join(import.meta.dirname, "../src/lib/gemini-cache.json");
const cache: Record<string, string> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
for (const r of RESPONSES) cache[cacheKeyFor(r.purpose, r.input)] = JSON.stringify(r.response);
fs.writeFileSync(file, JSON.stringify(cache, null, 2) + "\n");
console.log(`Wrote ${RESPONSES.length} demo responses to ${path.relative(process.cwd(), file)}`);
