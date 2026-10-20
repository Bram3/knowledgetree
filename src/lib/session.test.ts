import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionSecret, signSession, verifySession } from "./session";

const SECRET = "test-secret-at-least-32-characters-long";

describe("session token", () => {
  it("round-trips a signed person id", () => {
    expect(verifySession(signSession("amelie", SECRET), SECRET)).toBe("amelie");
  });

  it("rejects a bare person id typed into the cookie", () => {
    expect(verifySession("tom", SECRET)).toBeNull();
  });

  it("rejects a token whose id was swapped for another person", () => {
    const token = signSession("amelie", SECRET);
    const forged = token.replace(/^amelie/, "tom");
    expect(forged).not.toBe(token);
    expect(verifySession(forged, SECRET)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    expect(verifySession(signSession("amelie", "another-secret-of-sufficient-length!!"), SECRET)).toBeNull();
  });

  it("rejects empty or malformed tokens", () => {
    expect(verifySession(undefined, SECRET)).toBeNull();
    expect(verifySession("", SECRET)).toBeNull();
    expect(verifySession("amelie.", SECRET)).toBeNull();
  });
});

describe("session secret without SESSION_SECRET", () => {
  afterEach(() => vi.unstubAllEnvs());
  const secretWith = (nodeEnv: string | undefined) => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", nodeEnv);
    return sessionSecret();
  };

  it("uses the fixed dev-only fallback in development and tests", () => {
    expect(secretWith("development")).toBe(secretWith("test"));
  });

  it("anywhere else (production, staging, unset) uses a random per-process secret, never the dev one", () => {
    const dev = secretWith("development");
    for (const env of ["production", "staging", undefined]) {
      const secret = secretWith(env);
      expect(secret).not.toBe(dev);
      expect(secret).toHaveLength(64);
      expect(secretWith(env)).toBe(secret); // stable within the process
    }
  });
});
