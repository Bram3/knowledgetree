/**
 * Scene 2b (#19, second thought): the mail Lena drafts to Nike France. Shared by the Outlook mock (compose mode)
 * and the tests, so the committed Gemini cache matches the exact sentence that gets checked.
 * The draft says the cutoff is the 15th; the leaf on Nike France › Payroll says the 20th.
 */
export type Draft = { to: string; subject: string; text: string };

export const DEMO_DRAFT: Draft = {
  to: "sarah@nike.fr",
  subject: "November payroll Nike France",
  text: `Hi Sarah,

Quick reminder for the November run: the cutoff date is the 15th, so please send all variable input before then.

Have a nice weekend!

Lena`,
};
