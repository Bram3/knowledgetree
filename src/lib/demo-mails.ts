/**
 * Lena's inbox in the Outlook mock. Shared by the mock (client) and the tests, so the committed
 * Gemini cache (src/lib/gemini-cache.json) can be checked against the exact text that gets ingested.
 */
export type DemoMail = {
  id: string;
  from: string;
  email: string;
  subject: string;
  time: string;
  preview: string;
  body: string;
  attachment?: { name: string; size: string };
  unread: boolean;
};

export const DEMO_MAILS: DemoMail[] = [
  // Scene 3: the day after the call, Katrin confirms the 20th in writing. Reconfirms the call's leaf (×2).
  { id: "e7", from: "Katrin Vogel", email: "katrin.vogel@nike.com", subject: "RE: Payroll cutoff Nike Deutschland GmbH", time: "09:02", preview: "Hi Lena, as discussed on the phone: the cutoff is the 20th from next month…", body: `Hi Lena,

As discussed on the phone: from next month the payroll cutoff for variable input at Nike Deutschland GmbH is the 20th. Pay date stays the 25th.

Thanks for picking this up so quickly.

Katrin`, unread: true },
  { id: "e1", from: "Katrin Vogel", email: "katrin.vogel@nike.com", subject: "Updated payroll calendar Q4 2026 – Nike Deutschland GmbH", time: "08:41", preview: "Hi Lena, as discussed with Sofie, please find attached the new payroll calendar…", body: `Hi Lena,

As discussed with Sofie, please find attached the new payroll calendar for Nike Deutschland GmbH for Q4 2026.

Important: from the October run the cutoff for variable input moves from the 15th to the 18th of the month, because of our new time registration system. Pay date remains the 25th.

Could you confirm that SDWorx has this on file? We had some confusion last year with different versions floating around.

Mit freundlichen Grüßen,
Katrin Vogel
Head of Payroll Germany, Nike Deutschland GmbH`, attachment: { name: "Nike_DE_Payroll_Calendar_Q4_2026.xlsx", size: "128 KB" }, unread: true },
  { id: "e5", from: "Katrin Vogel", email: "katrin.vogel@nike.com", subject: "Thanks for the visit!", time: "08:12", preview: "Hi Lena, it was so nice to finally meet in person…", body: `Hi Lena,

It was so nice to finally meet in person last week. Thanks again for the chocolates, the whole team loved them!

Enjoy the weekend and say hi to Sofie.

Katrin`, unread: true },
  { id: "e6", from: "Ingrid Haas", email: "ingrid.haas@nike.com", subject: "Late payslips again", time: "Yesterday", preview: "Lena, this is the second time this quarter that payslips arrive late…", body: `Hi Lena,

This is the second time this quarter that payslips arrive late for some of our people. I need to understand what happened before our next steering meeting.

Best,
Ingrid Haas
HR Director EMEA, Nike`, unread: false },
  { id: "e2", from: "Marta Kowalski", email: "marta.kowalski@sdworx.com", subject: "RE: Nike MSA 2026 price schedule", time: "Yesterday", preview: "Uploaded v3 to the tree, Tom verified the appendix.", body: "Uploaded v3 to the tree, Tom verified the appendix.\n\nMarta", unread: false },
  { id: "e3", from: "Anouk de Vries", email: "anouk.devries@nike.com", subject: "Nike Hilversum: question about 30% ruling end dates", time: "Mon", preview: "Hi, two of our expats' rulings end in December…", body: "Hi,\n\nTwo of our expats' rulings end in December. Can you check what we need to do?\n\nAnouk", unread: false },
  { id: "e4", from: "Joris Bakker", email: "j.bakker@valk.nl", subject: "Van der Valk Hotel Amsterdam: new roster export", time: "Mon", preview: "Hi Pieter, from next month the roster export…", body: "Hi Pieter,\n\nFrom next month the roster export from Hotel Amsterdam comes from the new planning tool. Specification attached next week.\n\nJoris", unread: false },
];

/** The ingest input for a mail: subject + body as text, the mail id as source ref, the sender as "who said it". */
export function mailIngestInput(m: DemoMail) {
  return {
    channel: "mail" as const,
    trigger: "auto" as const,
    text: `${m.subject}\n\n${m.body}`,
    ref: `outlook:${m.id}`,
    from: `${m.from} <${m.email}>`,
  };
}
