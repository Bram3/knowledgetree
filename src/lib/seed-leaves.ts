import type { Leaf, LeafType, Channel } from "./types";

/**
 * Seeded leaves for scene 5 (handover): Jonas caught most of what we know about Nike Germany,
 * Lena a few, Sofie two. They hang on the Germany country node so the Nike Deutschland GmbH
 * demo (cutoff mail, call, conflict) starts clean. #14 seeds the full demo history.
 * Types and ages are picked so every leaf stays current (freshness.ts) for a few months after the demo clock:
 * no promises or changes, which fade within weeks.
 */

// Demo clock: 2026-09-30 (same as seed.ts)
const d = (daysAgo: number, hour = 10) => {
  const t = new Date(Date.UTC(2026, 8, 30, hour, 0, 0));
  t.setUTCDate(t.getUTCDate() - daysAgo);
  return t.toISOString();
};

type L = { id: string; by: string; daysAgo: number; channel: Channel; from: string; type: LeafType; category: string; statement: string; why?: string; quote: string; people?: string[] };

const KATRIN = "Katrin Vogel <katrin.vogel@nike.com>";
const BETRIEBSRAT = "Uwe Brandt <uwe.brandt@nike.com>";

const raw: L[] = [
  // Jonas (10)
  { id: "sl-jb-1", by: "jonas", daysAgo: 260, channel: "call", from: KATRIN, type: "expertise", category: "payroll", statement: "Katrin Vogel decides on every payroll exception for Nike Germany.", quote: "anything that deviates from the standard run goes through me", people: ["Katrin Vogel"] },
  { id: "sl-jb-2", by: "jonas", daysAgo: 210, channel: "mail", from: KATRIN, type: "attention", category: "payroll", statement: "Nike Germany wants payroll questions by mail, not by phone, so there is a written trail for the auditors.", why: "Yearly audit by their external auditor.", quote: "please send payroll questions by mail so our auditors can follow them", people: ["Katrin Vogel"] },
  { id: "sl-jb-3", by: "jonas", daysAgo: 200, channel: "teams", from: "Jonas Becker", type: "decision", category: "time", statement: "Overtime in German stores is paid out monthly, not banked as time off.", why: "Agreed with the works council in 2025.", quote: "overtime is paid out every month, no time bank", people: [] },
  { id: "sl-jb-4", by: "jonas", daysAgo: 180, channel: "call", from: BETRIEBSRAT, type: "attention", category: "time", statement: "The works council (Betriebsrat) must approve every change to shift patterns before payroll applies it.", quote: "no shift pattern changes without the Betriebsrat signing off", people: ["Uwe Brandt"] },
  { id: "sl-jb-5", by: "jonas", daysAgo: 150, channel: "mail", from: KATRIN, type: "decision", category: "hr-admin", statement: "SDWorx sends the DEÜV registration confirmation for every new hire within 2 working days.", quote: "you confirm each DEÜV registration within two working days", people: ["Katrin Vogel"] },
  { id: "sl-jb-6", by: "jonas", daysAgo: 60, channel: "call", from: KATRIN, type: "risk", category: "contract", statement: "Nike Germany is unhappy about two late corrections this year and mentioned the SLA penalties.", quote: "two late corrections this year, we will look at the SLA penalties", people: ["Katrin Vogel"] },
  { id: "sl-jb-7", by: "jonas", daysAgo: 95, channel: "mail", from: KATRIN, type: "decision", category: "hr-admin", statement: "Company car benefits in Germany are now reported per quarter instead of per month.", quote: "from Q2 we report company car benefits per quarter", people: ["Katrin Vogel"] },
  { id: "sl-jb-8", by: "jonas", daysAgo: 70, channel: "teams", from: "Jonas Becker", type: "expertise", category: "payroll", statement: "Only Jonas knows the manual workaround for Christmas bonus pro-rating of part-timers in Germany.", quote: "the Christmas bonus for part-timers I pro-rate by hand", people: ["Jonas Becker"] },
  { id: "sl-jb-9", by: "jonas", daysAgo: 45, channel: "call", from: KATRIN, type: "decision", category: "payroll", statement: "Agreed: SDWorx does a dry run of the October payroll on the new time registration export.", quote: "we do a dry run on the new export before the October payroll", people: ["Katrin Vogel"] },
  { id: "sl-jb-10", by: "jonas", daysAgo: 30, channel: "mail", from: KATRIN, type: "attention", category: "payroll", statement: "Nike Germany wants the payslip PDFs in German and English from 2027.", quote: "payslips in German and English from January 2027", people: ["Katrin Vogel"] },
  // Lena (6)
  { id: "sl-lv-1", by: "lena", daysAgo: 60, channel: "mail", from: KATRIN, type: "attention", category: "hr-admin", statement: "New hires in German stores often start mid-month, so the first payslip is always pro-rated.", quote: "most store hires start in the middle of the month", people: ["Katrin Vogel"] },
  { id: "sl-lv-2", by: "lena", daysAgo: 50, channel: "call", from: KATRIN, type: "expertise", category: "time", statement: "Katrin's deputy, Felix Wagner, answers time registration questions when she is out.", quote: "when I am out, Felix Wagner handles the time registration questions", people: ["Felix Wagner"] },
  { id: "sl-lv-3", by: "lena", daysAgo: 40, channel: "teams", from: "Lena Vermeulen", type: "decision", category: "payroll", statement: "Corrections for Nike Germany go into the correction run on the 3rd, never into a manual off-cycle payment.", why: "Off-cycle payments broke the bank file twice.", quote: "corrections go into the run on the 3rd, no off-cycle payments", people: [] },
  { id: "sl-lv-4", by: "lena", daysAgo: 25, channel: "mail", from: KATRIN, type: "risk", category: "time", statement: "Store managers in Germany still fill in paper timesheets until the new system is live.", quote: "store managers keep using paper timesheets until the switch", people: ["Katrin Vogel"] },
  { id: "sl-lv-5", by: "lena", daysAgo: 15, channel: "call", from: KATRIN, type: "attention", category: "hr-admin", statement: "Lena sends Katrin a checklist for the switch to the new time registration system.", quote: "I will send you a checklist for the switch", people: ["Katrin Vogel"] },
  { id: "sl-lv-6", by: "lena", daysAgo: 8, channel: "mail", from: KATRIN, type: "attention", category: "payroll", statement: "Katrin is on holiday the first two weeks of November; Felix Wagner signs off the payroll then.", quote: "Felix Wagner signs off the November payroll while I am away", people: ["Katrin Vogel", "Felix Wagner"] },
  // Sofie (2)
  { id: "sl-sd-1", by: "sofie", daysAgo: 330, channel: "mail", from: KATRIN, type: "expertise", category: "hr-admin", statement: "Nike Germany uses AOK as default health insurer for new hires who don't choose one.", quote: "if they don't choose, we register them with the AOK", people: [] },
  { id: "sl-sd-2", by: "sofie", daysAgo: 200, channel: "call", from: KATRIN, type: "attention", category: "payroll", statement: "Tax class changes reach Nike Germany late; check ELStAM before every run.", quote: "tax class changes reach us late, always check ELStAM", people: [] },
];

export const seedLeaves: Leaf[] = raw.map((l) => ({
  id: l.id,
  nodeId: "nk-de",
  category: l.category,
  type: l.type,
  statement: l.statement,
  why: l.why,
  quote: l.quote,
  people: l.people ?? [],
  source: { channel: l.channel, trigger: "auto", ref: `seed:${l.id}`, at: d(l.daysAgo), byId: l.by, from: l.from },
  confidence: 0.9,
  status: "auto",
  reconfirmedAt: [],
  usefulCount: 0,
}));
