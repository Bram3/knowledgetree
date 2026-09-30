# Demo voice-over

A 3-minute narrated demo of KnowledgeTree. Paste the prompt below into an AI text-to-speech tool (ElevenLabs, OpenAI TTS, Google Cloud Text-to-Speech, Azure Speech). Each numbered step has one screenshot in this folder; show it while that part plays.

## Prompt for the text-to-speech tool

```
Voice: warm, confident, professional narrator. Neutral English, light Belgian accent is fine.
Pace: calm, about 150 words per minute. Short pauses at [pause], a longer pause at [beat].
Tone: a colleague explaining a product they are proud of, not a commercial. No exclamation marks.
Read the numbered steps as one continuous narration; do not read the step numbers or the screenshot names.

1. Every payroll consultant at SDWorx knows this moment. A customer asks an urgent question. You find three documents with three answers. One is old, one has no owner, and one might be for another country. [pause] The information exists. The confidence does not. [beat]

2. This is KnowledgeTree. One organigram per customer. Every entity owns its knowledge. And every change has a name. [pause] Lena is a payroll consultant. She signs in and sees only the customers she is assigned to. [beat]

3. Nike Germany just asked what the payroll cutoff is. They heard it changed. [pause] Lena types the question. [beat]

4. One answer. It belongs to Nike Deutschland GmbH, in the Payroll category. It was written by Jonas, it is version two, and the expert to call is right there. [pause] No pile of documents. One fact, with its provenance. [beat]

5. Behind that answer is the tree. Nike EMEA, the countries, the legal entities. [pause] Every entity carries the same shelves: Payroll, Time and Attendance, HR Administration, Contract. Nike subscribes to four products, so every entity has exactly those four categories, even when they are empty. Nothing can hide in a random folder. [beat]

6. Lena clicks Nike Deutschland GmbH. The view zooms in and unfolds its product nodes. [beat]

7. She opens Payroll. Two kinds of documents, kept apart. On top, what SDWorx wrote. Below, what the customer sent us, stored exactly as received. [beat]

8. Documents are real. The Lohnsteuer registration opens right here, and can be downloaded in its original format. [beat]

9. Notes are written in a proper editor. Lena updates the cutoff note and gives a reason. [pause] Saving creates version three, under her name. [beat]

10. The version history shows who changed what, and why. The old note about the fifteenth is not deleted. It is archived, so history stays visible, but it never competes with the current answer again. [beat]

11. Knowledge is born in Teams and in email, so KnowledgeTree lives there too. [pause] On Sofie's message, Lena clicks Save to KnowledgeTree. The right customer, entity and category are detected. One click, and the message is on the node, with a link back to the chat. [beat]

12. She can also just ask the tree from Teams. Same answer, same owner, same version. [beat]

13. In Outlook, the add-in recognises Katrin Vogel's email from Nike Germany, shows what the tree already knows, and files the new payroll calendar to the same entity, as a document received from the customer. [beat]

14. Every step Lena took today is on the changes page, with her name on every line. And so are the changes of her colleagues, across all of her customers. [beat]

15. Access follows the customer. When Amélie signs in, Nike is simply not there. [beat]

16. Find it. Understand it. Trust it. [pause] KnowledgeTree makes trust structural. Not a score, not a guess. One place per fact, one owner, one history. [pause] Thank you.
```

## Screenshots per step

| Step | Narration | Screenshot |
| --- | --- | --- |
| 1 | The problem | *(no screenshot: title slide or the challenge brief)* |
| 2 | Sign in as Lena | `step-01-login.png` |
| 3 | Type the question | `step-02-question.png` |
| 4 | One answer with provenance | `step-03-answer.png` |
| 5 | The organigram with fixed shelves | `step-04-organigram.png` |
| 6 | Zoom into Nike Deutschland GmbH | `step-05-entity.png` |
| 7 | The Payroll shelf, SDWorx vs customer | `step-06-payroll-shelf.png` |
| 8 | Document viewer and download | `step-07-document.png` |
| 9 | Note editor with a reason | `step-08-editor.png` |
| 10 | Version history | `step-09-version-history.png` |
| 11 | Save from Teams | `step-10-teams-save.png` |
| 12 | Ask the tree from Teams | `step-11-teams-bot.png` |
| 13 | Outlook add-in files the calendar | `step-12-outlook.png`, then `step-13-outlook-filed.png` |
| 14 | Changes page | `step-14-changes.png` |
| 15 | Amélie has no access to Nike | `step-15-amelie.png` |
| 16 | Closing line | *(title slide)* |

Timing: about 430 words, roughly 3 minutes at the suggested pace. Live demo alternative: open https://knowledgetree-99869633039.europe-west1.run.app and follow the same steps; press **Reset demo data** in the sidebar first.
