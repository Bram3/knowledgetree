/**
 * Shared test harness for code that runs inside Next request scope (server actions, route handlers).
 * Import this module first in a test file (before anything from src/lib), then use `signInAs` / `signOut`.
 *
 * - `next/headers` cookies() is backed by an in-memory jar.
 * - `next/navigation` redirect() throws `Redirect` so tests can assert on it.
 * - `next/cache` revalidatePath() is a no-op.
 * - The JSON database and uploads live in a fresh temp dir (KT_DATA_DIR) per test file.
 */
import { vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

export const jar = new Map<string, string>();

export class Redirect extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers(),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
  notFound: () => {
    throw new Redirect("/404");
  },
}));

process.env.KT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "kt-test-"));

export async function signInAs(personId: string) {
  const { USER_COOKIE } = await import("@/lib/auth");
  const { signSession, sessionSecret } = await import("@/lib/session");
  jar.set(USER_COOKIE, signSession(personId, sessionSecret()));
}

export async function setRawCookie(value: string) {
  const { USER_COOKIE } = await import("@/lib/auth");
  jar.set(USER_COOKIE, value);
}

export function signOut() {
  jar.clear();
}
