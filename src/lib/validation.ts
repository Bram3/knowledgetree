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
