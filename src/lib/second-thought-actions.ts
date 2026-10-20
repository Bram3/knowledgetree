"use server";

import { requireUser } from "./auth";
import { requireLeafAccess } from "./access";
import { checkDraft, confirmFromDraft, disputeFromDraft, validateDraft, MAX_DRAFT_CHARS, type DraftAnswer, type SecondThought } from "./second-thought";
import { revalidateAll } from "./revalidate";
import { idString, ValidationError } from "./validation";
import type { Leaf } from "./types";

/** #19: check a mail draft against the leaves on the recipient's branch (Outlook compose, on a typing pause and on Send). */
export async function checkDraftText(input: unknown): Promise<SecondThought[]> {
  const user = await requireUser();
  return checkDraft(user, validateDraft(input));
}

const MAX_FIELD = 300;

function validateAnswer(input: unknown): { choice: "change" | "mine" } & DraftAnswer {
  const a = (input ?? {}) as Record<string, unknown>;
  if (a.choice !== "change" && a.choice !== "mine") throw new ValidationError("Unknown answer");
  const text = (v: unknown, max: number, what: string) => {
    if (typeof v !== "string" || !v.trim() || v.length > max) throw new ValidationError(`Bad ${what}`);
    return v;
  };
  return {
    choice: a.choice,
    leafId: idString(a.leafId, "leaf id"),
    ref: idString(a.ref, "draft ref"),
    to: text(a.to, 200, "recipient"),
    sentence: text(a.sentence, MAX_DRAFT_CHARS, "sentence"),
    claim: text(a.claim, MAX_FIELD, "claim"),
    said: text(a.said, MAX_FIELD, "claim"),
    noted: text(a.noted, MAX_FIELD, "claim"),
  };
}

/**
 * The answer on a second-thought card. "change": the leaf is reconfirmed. "mine": the draft's claim becomes a new
 * leaf in conflict with it, and the branch owner gets one question. ("Ignore" stays in the client: nothing happens.)
 */
export async function answerSecondThought(input: unknown): Promise<{ leaf: Leaf }> {
  const { choice, ...answer } = validateAnswer(input);
  const { user } = await requireLeafAccess(answer.leafId);
  const leaf = choice === "change" ? confirmFromDraft(user, answer) : disputeFromDraft(user, answer).leaf;
  revalidateAll();
  return { leaf };
}
