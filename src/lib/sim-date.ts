/**
 * The simulated date of the demo time slider ("today" up to +12 months). Pure and client-safe.
 * The server reads the slider from a cookie: see clock.ts (`now()`), which every reader of freshness should use.
 */

export const MAX_MONTHS_AHEAD = 12;
export const SIM_COOKIE = "kt_sim_months";

/** `today` moved forward by whole calendar months. */
export function simulatedDate(today: Date, monthsAhead: number): Date {
  const d = new Date(today);
  d.setUTCMonth(d.getUTCMonth() + monthsAhead);
  return d;
}

/** Slider value from untrusted input (cookie, form): an integer 0..MAX_MONTHS_AHEAD, 0 when unreadable. */
export function parseMonthsAhead(raw: unknown): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_MONTHS_AHEAD, Math.max(0, Math.floor(n)));
}
