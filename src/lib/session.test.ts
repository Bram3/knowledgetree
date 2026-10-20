import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

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
