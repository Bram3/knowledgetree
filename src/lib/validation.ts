/**
 * Malformed input sent straight to a server action (wrong type, too long, missing). Not an access problem:
 * a well-formed id the user may not touch still throws AccessDeniedError (access.ts).
 */
export class ValidationError extends Error {
  constructor(message = "Invalid input") {
    super(message);
    this.name = "ValidationError";
  }
}

const MAX_ID = 100;

/** A non-empty id string of reasonable length, else ValidationError. */
export function idString(v: unknown, what = "id"): string {
  if (typeof v !== "string" || !v || v.length > MAX_ID) throw new ValidationError(`Bad ${what}`);
  return v;
}

/** A list of at most `max` id strings, else ValidationError. */
export function idList(v: unknown, max: number, what = "ids"): string[] {
  if (!Array.isArray(v) || v.length > max) throw new ValidationError(`Bad ${what}`);
  return v.map((id) => idString(id, what));
}

/** Lengths for free text sent to server actions. Notes are markdown; titles, topics and reasons are one-liners. */
export const MAX_TEXT = 200;
export const MAX_CONTENT = 20_000;
export const MAX_QUESTION = 2_000;

/** A string of at most `max` characters, else ValidationError. */
export function textString(v: unknown, max: number, what: string): string {
  if (typeof v !== "string" || v.length > max) throw new ValidationError(`Bad ${what}`);
  return v;
}

/** Like textString, but undefined/null pass through as undefined. */
export function optionalText(v: unknown, max: number, what: string): string | undefined {
  return v === undefined || v === null ? undefined : textString(v, max, what);
}

/** One of the allowed literal values, else ValidationError. */
export function oneOf<T extends string>(v: unknown, allowed: readonly T[], what: string): T {
  if (!allowed.includes(v as T)) throw new ValidationError(`Bad ${what}`);
  return v as T;
}

/** A plain object (not null, not an array), else ValidationError. */
export function record(v: unknown, what: string): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ValidationError(`Bad ${what}`);
  return v as Record<string, unknown>;
}
