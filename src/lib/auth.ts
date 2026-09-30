import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import type { Person } from "./types";

export const USER_COOKIE = "kt_user";

export async function getCurrentUser(): Promise<Person | null> {
  const c = await cookies();
  const id = c.get(USER_COOKIE)?.value;
  if (!id) return null;
  return getDb().people.find((p) => p.id === id) ?? null;
}

export async function requireUser(): Promise<Person> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export function canAccess(user: Person, companyId: string) {
  return user.customerIds.includes(companyId);
}

export function accessibleCompanies(user: Person) {
  return getDb().companies.filter((c) => user.customerIds.includes(c.id));
}
