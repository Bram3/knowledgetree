import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { sessionSecret, signSession, verifySession } from "./session";
import type { Person } from "./types";

export const USER_COOKIE = "kt_user";

/** Options for every cookie tied to the session (sign-in, simulated date): not readable by scripts, same-site only. */
export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const;

/** The signed-in person, or null. Only a cookie signed with SESSION_SECRET counts. */
export async function getCurrentUser(): Promise<Person | null> {
  const c = await cookies();
  const id = verifySession(c.get(USER_COOKIE)?.value, sessionSecret());
  if (!id) return null;
  return getDb().people.find((p) => p.id === id) ?? null;
}

/** Writes the signed session cookie for `personId`. */
export async function setSessionCookie(personId: string) {
  (await cookies()).set(USER_COOKIE, signSession(personId, sessionSecret()), SESSION_COOKIE_OPTIONS);
}

export async function requireUser(): Promise<Person> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export function canAccess(user: Person, companyId: string) {
  return user.customerIds.includes(companyId);
}

/** `a` and `b` are both assigned to at least one customer. */
export function sharesCustomer(a: Person, b: Person) {
  return a.customerIds.some((c) => b.customerIds.includes(c));
}

export function accessibleCompanies(user: Person) {
  return getDb().companies.filter((c) => user.customerIds.includes(c.id));
}
