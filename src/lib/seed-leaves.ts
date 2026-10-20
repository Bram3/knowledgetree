import type { Leaf, LeafType, Channel } from "./types";

/**
 * The demo's leaf history (ticket #14), seeded by "Reset demo data".
 *
 * Ages are counted back from the moment of the reset, not from a fixed date, so every take shows the same tree
 * whatever day it is recorded: all leaves green at today, and at +6 months on the time slider decisions and
 * expertise turn yellow, attention points brown, and risks, changes and promises fall (see freshness.ts).
 *
 * Germany (scene 5, knowledge risk): Jonas caught 15 leaves and wrote 3 notes, Lena caught 6, Sofie 1.
 * The demo adds 4 of Lena's (3 from the call, 1 from the 🍃 in Teams), so when scene 5 starts Jonas carries
 * 18 of 29 = 62% of what we know about Nike Germany, and Lena is the suggested successor.
 * Nothing seeded hangs on Nike Deutschland GmbH › Payroll, so the call, the conflict and the ×2 start clean.
 * France has one leaf, reconfirmed 4 times: the cutoff is the 20th (scene 2b, Lena's draft to Sarah says the 15th).
 * Belgium gets a few of Sofie's leaves so the rest of the tree has leaves too (fewer than Jonas has in Germany).
 */

/** A later message that said the same thing again (×n), `daysAgo` before the reset. */
type Heard = { daysAgo: number; by: string; channel: Channel; from: string };
type L = { id: string; by: string; daysAgo: number; nodeId: string; channel: Channel; from: string; type: LeafType; category: string; statement: string; why?: string; quote: string; people?: string[]; heard?: Heard[] };

const KATRIN = "Katrin Vogel <katrin.vogel@nike.com>";
const UWE = "Uwe Brandt <uwe.brandt@nike.com>";
const BART = "Bart Claes <bart.claes@nike.com>";
const JULIEN = "Julien Moreau <julien.moreau@nike.fr>";
const SARAH = "Sarah Laurent <sarah@nike.fr>";

const raw: L[] = [
  // ---- Germany: Jonas (15)
  { id: "sl-jb-1", by: "jonas", daysAgo: 120, nodeId: "nk-de", channel: "call", from: KATRIN, type: "expertise", category: "payroll", statement: "Katrin Vogel decides on every payroll exception for Nike Germany.", quote: "anything that deviates from the standard run goes through me", people: ["Katrin Vogel"] },
  { id: "sl-jb-2", by: "jonas", daysAgo: 60, nodeId: "nk-de", channel: "mail", from: KATRIN, type: "attention", category: "payroll", statement: "Nike Germany wants payroll questions by mail, not by phone, so there is a written trail for the auditors.", why: "Yearly audit by their external auditor.", quote: "please send payroll questions by mail so our auditors can follow them", people: ["Katrin Vogel"] },
  { id: "sl-jb-3", by: "jonas", daysAgo: 110, nodeId: "nk-de", channel: "teams", from: "Jonas Becker", type: "decision", category: "time", statement: "Overtime in German stores is paid out monthly, not banked as time off.", why: "Agreed with the works council in 2025.", quote: "overtime is paid out every month, no time bank" },
  { id: "sl-jb-4", by: "jonas", daysAgo: 55, nodeId: "nk-de", channel: "call", from: UWE, type: "attention", category: "time", statement: "The works council (Betriebsrat) must approve every change to shift patterns before payroll applies it.", quote: "no shift pattern changes without the Betriebsrat signing off", people: ["Uwe Brandt"] },
  { id: "sl-jb-5", by: "jonas", daysAgo: 90, nodeId: "nk-de", channel: "mail", from: KATRIN, type: "decision", category: "hr-admin", statement: "SDWorx sends the DEÜV registration confirmation for every new hire within 2 working days.", quote: "you confirm each DEÜV registration within two working days", people: ["Katrin Vogel"] },
  { id: "sl-jb-6", by: "jonas", daysAgo: 28, nodeId: "nk-de", channel: "call", from: KATRIN, type: "risk", category: "contract", statement: "Nike Germany is unhappy about two late corrections this year and mentioned the SLA penalties.", quote: "two late corrections this year, we will look at the SLA penalties", people: ["Katrin Vogel"] },
  { id: "sl-jb-7", by: "jonas", daysAgo: 75, nodeId: "nk-de", channel: "mail", from: KATRIN, type: "decision", category: "hr-admin", statement: "Company car benefits in Germany are reported per quarter instead of per month.", quote: "from Q2 we report company car benefits per quarter", people: ["Katrin Vogel"] },
  { id: "sl-jb-8", by: "jonas", daysAgo: 100, nodeId: "nk-de", channel: "teams", from: "Jonas Becker", type: "expertise", category: "payroll", statement: "Jonas knows the manual workaround for pro-rating the Christmas bonus of part-timers in Germany.", quote: "the Christmas bonus for part-timers I pro-rate by hand", people: ["Jonas Becker"] },
  { id: "sl-jb-9", by: "jonas", daysAgo: 45, nodeId: "nk-de", channel: "call", from: KATRIN, type: "decision", category: "payroll", statement: "Agreed: SDWorx does a dry run of the first payroll on the new time registration export.", quote: "we do a dry run on the new export before the first payroll", people: ["Katrin Vogel"] },
  { id: "sl-jb-10", by: "jonas", daysAgo: 30, nodeId: "nk-de", channel: "mail", from: KATRIN, type: "attention", category: "payroll", statement: "Nike Germany wants the payslip PDFs in German and English from 2027.", quote: "payslips in German and English from January 2027", people: ["Katrin Vogel"] },
  { id: "sl-jb-11", by: "jonas", daysAgo: 14, nodeId: "nk-de-retail", channel: "mail", from: KATRIN, type: "change", category: "time", statement: "From next month Nike Retail Germany sends store hours every week instead of once a month.", quote: "from next month the stores send their hours every week", people: ["Katrin Vogel"] },
  { id: "sl-jb-12", by: "jonas", daysAgo: 3, nodeId: "nk-de", channel: "call", from: KATRIN, type: "promise", category: "contract", statement: "Jonas sends Katrin the report on this year's late corrections before the steering meeting.", quote: "I'll send you the correction report before the steering meeting", people: ["Katrin Vogel"] },
  { id: "sl-jb-13", by: "jonas", daysAgo: 20, nodeId: "nk-de-retail", channel: "call", from: KATRIN, type: "risk", category: "payroll", statement: "Store managers at Nike Retail Germany submit hours late in the December peak, so expect corrections in January.", quote: "in December the store managers are always late with the hours", people: ["Katrin Vogel"] },
  { id: "sl-jb-14", by: "jonas", daysAgo: 40, nodeId: "nk-de-retail", channel: "mail", from: KATRIN, type: "attention", category: "hr-admin", statement: "Mini-jobbers at Nike Retail Germany are registered with the Minijob-Zentrale, not with a health insurer.", quote: "mini-jobbers go to the Minijob-Zentrale", people: ["Katrin Vogel"] },
  { id: "sl-jb-15", by: "jonas", daysAgo: 125, nodeId: "nk-de", channel: "mail", from: KATRIN, type: "decision", category: "contract", statement: "Off-cycle payroll runs for Nike Germany are invoiced per run, as agreed in the 2025 contract addendum.", why: "Off-cycle runs are not in the base fee.", quote: "off-cycle runs are invoiced per run, as in the addendum", people: ["Katrin Vogel"] },
  // ---- Germany: Lena (6)
  { id: "sl-lv-1", by: "lena", daysAgo: 50, nodeId: "nk-de", channel: "mail", from: KATRIN, type: "attention", category: "hr-admin", statement: "New hires in German stores often start mid-month, so the first payslip is always pro-rated.", quote: "most store hires start in the middle of the month", people: ["Katrin Vogel"] },
  { id: "sl-lv-2", by: "lena", daysAgo: 35, nodeId: "nk-de", channel: "call", from: KATRIN, type: "expertise", category: "time", statement: "Felix Wagner, Katrin's deputy, answers time registration questions when she is out.", quote: "when I am out, Felix Wagner handles the time registration questions", people: ["Felix Wagner"] },
  { id: "sl-lv-3", by: "lena", daysAgo: 25, nodeId: "nk-de", channel: "teams", from: "Lena Vermeulen", type: "decision", category: "payroll", statement: "Corrections for Nike Germany go into the correction run on the 3rd, never into a manual off-cycle payment.", why: "Off-cycle payments broke the bank file twice.", quote: "corrections go into the run on the 3rd, no off-cycle payments" },
  { id: "sl-lv-4", by: "lena", daysAgo: 12, nodeId: "nk-de", channel: "mail", from: KATRIN, type: "risk", category: "time", statement: "Some German stores still fill in paper timesheets until every store is on the new time system.", quote: "some stores keep using paper timesheets until the switch is complete", people: ["Katrin Vogel"] },
  { id: "sl-lv-5", by: "lena", daysAgo: 6, nodeId: "nk-de", channel: "call", from: KATRIN, type: "change", category: "hr-admin", statement: "From next month Nike Germany uploads new hires through the HR portal instead of sending them by mail.", quote: "from next month we upload new hires in the portal", people: ["Katrin Vogel"] },
  { id: "sl-lv-6", by: "lena", daysAgo: 8, nodeId: "nk-de", channel: "mail", from: KATRIN, type: "attention", category: "payroll", statement: "Nike Germany wants the payroll journal as a CSV file, not a PDF.", quote: "please send the payroll journal as CSV, not PDF", people: ["Katrin Vogel"] },
  // ---- Germany: Sofie (1)
  { id: "sl-sd-1", by: "sofie", daysAgo: 115, nodeId: "nk-de", channel: "mail", from: KATRIN, type: "expertise", category: "hr-admin", statement: "Nike Germany registers new hires who don't choose a health insurer with the AOK.", quote: "if they don't choose, we register them with the AOK" },
  // ---- Belgium: Sofie
  { id: "sl-be-1", by: "sofie", daysAgo: 40, nodeId: "nk-be", channel: "mail", from: BART, type: "attention", category: "payroll", statement: "The targets for the Nike Belgium CAO 90 bonus must be filed before the reference period starts.", quote: "the CAO 90 targets have to be filed before the period starts", people: ["Bart Claes"] },
  { id: "sl-be-2", by: "sofie", daysAgo: 2, nodeId: "nk-be-elc", channel: "call", from: BART, type: "promise", category: "time", statement: "Sofie checks the night shift premiums of the ELC Laakdal October run before Friday.", quote: "I'll check the night shift premiums before Friday", people: ["Bart Claes"] },
  { id: "sl-be-3", by: "sofie", daysAgo: 80, nodeId: "nk-be-retail", channel: "mail", from: BART, type: "decision", category: "hr-admin", statement: "Meal vouchers at Nike Retail Belgium stay at 8 euro in 2027.", why: "Agreed in the 2026 negotiation with the unions.", quote: "meal vouchers stay at 8 euro next year", people: ["Bart Claes"] },
  { id: "sl-be-4", by: "sofie", daysAgo: 18, nodeId: "nk-be-elc", channel: "teams", from: "Sofie De Smet", type: "risk", category: "hr-admin", statement: "Peak season temp workers at ELC Laakdal are often declared late in Dimona.", quote: "the peak season temps are often late in Dimona" },
  // ---- France (scene 2b, second thought): the finance contact's mail of early March (231 days before the
  // recording day, 20 October), said again 4 times since by other people, so it doesn't weigh on the knowledge risk.
  { id: "sl-fr-1", by: "sofie", daysAgo: 231, nodeId: "nk-fr", channel: "mail", from: JULIEN, type: "decision", category: "payroll", statement: "Cutoff date for Nike France is the 20th.", quote: "the cutoff date for Nike France is the 20th of the month", people: ["Julien Moreau"],
    heard: [
      { daysAgo: 170, by: "marta", channel: "call", from: JULIEN },
      { daysAgo: 110, by: "lena", channel: "mail", from: SARAH },
      { daysAgo: 52, by: "tom", channel: "teams", from: "Marta Kowalski" },
      { daysAgo: 9, by: "lena", channel: "mail", from: SARAH },
    ] },
];

const DAY_MS = 86_400_000;

/** The seeded leaves as of `today` (the moment of the reset): each one caught `daysAgo` days earlier, at 10:00 UTC. */
export function seedLeavesAt(today: Date): Leaf[] {
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const at = (daysAgo: number) => new Date(midnight - daysAgo * DAY_MS + 10 * 3_600_000).toISOString();
  const heard = (l: L) => (l.heard ?? []).map((h, i) => ({ channel: h.channel, trigger: "auto" as const, ref: `seed:${l.id}:${i + 1}`, at: at(h.daysAgo), byId: h.by, from: h.from }));
  return raw.map((l) => ({
    id: l.id,
    nodeId: l.nodeId,
    category: l.category,
    type: l.type,
    statement: l.statement,
    why: l.why,
    quote: l.quote,
    people: l.people ?? [],
    source: { channel: l.channel, trigger: "auto", ref: `seed:${l.id}`, at: at(l.daysAgo), byId: l.by, from: l.from },
    confidence: 0.9,
    status: "auto",
    reconfirmedAt: heard(l).map((h) => h.at),
    ...(l.heard ? { reconfirmedBy: heard(l) } : {}),
    usefulCount: 0,
  }));
}

/** The seeded leaves as of when this module loaded. "Reset demo data" uses `seedLeavesAt(new Date())`. */
export const seedLeaves: Leaf[] = seedLeavesAt(new Date());
