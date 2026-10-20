import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Signed session tokens: `<personId>.<hmac-sha256 base64url>`.
 * The cookie can be read but not forged without the secret.
 */

function mac(personId: string, secret: string) {
  return createHmac("sha256", secret).update(personId).digest("base64url");
}

export function signSession(personId: string, secret: string): string {
  return `${personId}.${mac(personId, secret)}`;
}

/** Returns the person id if the token was signed with `secret`, otherwise null. */
export function verifySession(token: string | undefined, secret: string): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const personId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(mac(personId, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return personId;
}

const DEV_SECRET = "knowledgetree-dev-only-session-secret-do-not-use-in-prod";
let ephemeral: string | undefined;

/**
 * The cookie-signing secret. Reads `SESSION_SECRET` from the environment.
 * Only in development and tests a fixed dev-only fallback is used; anywhere else without a
 * secret a random per-process secret is used (sessions reset on restart).
 */
export function sessionSecret(): string {
  const env = process.env.SESSION_SECRET;
  if (env) return env;
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") return DEV_SECRET;
  if (!ephemeral) {
    ephemeral = randomBytes(32).toString("hex");
    console.warn("SESSION_SECRET is not set: using a random per-process secret. Sessions will not survive a restart.");
  }
  return ephemeral;
}
