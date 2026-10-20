import { cookies } from "next/headers";
import { parseMonthsAhead, simulatedDate, SIM_COOKIE } from "./sim-date";

/**
 * Server-side "now" for everything that ages (freshness, archive, digest): the real date moved forward
 * by the demo time slider. Reads the slider cookie, so call it inside a request (page, action, route).
 */

/** Months the slider is ahead of today (0..12). */
export async function monthsAhead(): Promise<number> {
  return parseMonthsAhead((await cookies()).get(SIM_COOKIE)?.value);
}

/** The simulated date: today plus the slider. Use this instead of `new Date()` when reading freshness. */
export async function now(): Promise<Date> {
  return simulatedDate(new Date(), await monthsAhead());
}
