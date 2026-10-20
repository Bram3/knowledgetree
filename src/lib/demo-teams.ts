/**
 * The chat with Sofie in the Teams mock. Shared by the mock (client) and the tests, so the committed
 * Gemini cache (src/lib/gemini-cache.json) can be checked against the exact text that gets ingested.
 */
export type DemoTeamsMessage = { id: string; from: string; initials: string; color: string; at: string; text: string; me?: boolean };

export const DEMO_TEAMS_MESSAGES: DemoTeamsMessage[] = [
  { id: "m1", from: "Sofie De Smet", initials: "SD", color: "bg-[#f1002f]", at: "09:12", text: "Morning Lena! Handing Nike over to you as discussed. Most of it is in the tree already, the rest I will add this week." },
  { id: "m2", from: "Lena Vermeulen", initials: "LV", color: "bg-[#001c52]", at: "09:14", text: "Thanks Sofie! Katrin from Nike Germany just asked what the payroll cutoff is, she heard it changed?", me: true },
  { id: "m3", from: "Sofie De Smet", initials: "SD", color: "bg-[#f1002f]", at: "09:16", text: "Yes, FYI Nike Deutschland GmbH confirmed the payroll cutoff moves to the 18th from the October run (was the 15th). Pay date stays the 25th. Katrin will send the new calendar by mail. Jonas already knows." },
];

/** The ingest input for a 🍃 reaction: the message text, the message id as source ref, the author as "who said it". */
export function teamsReactionInput(m: Pick<DemoTeamsMessage, "id" | "from" | "text">) {
  return { channel: "teams" as const, trigger: "reaction" as const, text: m.text, ref: `teams:${m.id}`, from: m.from };
}
