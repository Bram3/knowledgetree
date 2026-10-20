# Demo runbook: Leaf a thought (scenes 0–6)

Checklist for recording the finals demo. The same flow is tested end to end in `src/lib/demo-run.test.ts`
(twice in a row, Vertex unreachable).

## Before you record

- [ ] Run without Vertex (no `GOOGLE_CLOUD_PROJECT`), or set `GEMINI_PREFER_CACHE=1`. Every demo input is in the
      committed cache (`src/lib/gemini-cache.json`), so each take is identical. With live Vertex and no prefer-cache,
      the call transcript can differ and its leaves miss the cache.
- [ ] 1920×1080, browser at 125 %, no bookmarks bar, extensions or notifications.
- [ ] Sign in as **Lena Vermeulen**.
- [ ] Click **Reset demo data** (sidebar) before every take. Seeded leaves are aged from the moment of the reset,
      so the tree looks the same on any day.
- [ ] The time slider is at today (click **Back to today** if not).
- [ ] Don't open other mails or react to other Teams messages during a take (other orders work, but they add leaves).

## Scene 0: the Nike EMEA tree

- [ ] Customers › **Nike EMEA**. Zoom slowly onto **Nike Deutschland GmbH**.
- Expect: every leaf dot green. Knowledge risk chip: **72 %** from Jonas (Germany).

## Scene 1: call → three leaves

- [ ] Sidebar **Teams call** › **Call Katrin**. Let the audio play; it hangs up by itself (or click **Hang up**).
- Expect: toast "🍃 3 leaves caught" on Nike EMEA › Germany › Nike Deutschland GmbH. Leaves on the Payroll shelf:
  - change: cutoff moves from the 15th to the 20th (red: conflict with Jonas's note)
  - attention: bonus changes need Betriebsrat approval first
  - expertise: Jonas handled that approval last year
- [ ] Click a leaf: quote, source (call with Katrin Vogel), confidence.

## Scene 2: 🍃 on Sofie's message

- [ ] Sidebar **Teams** › hover Sofie's last message ("…overtime in a separate export…") › click 🍃.
- Expect: "🍃 1" pill with a link to Nike Deutschland GmbH. One attention point: load both exports (hours and
  overtime) before the cutoff.

## Scene 3: conflict → Correct → ×2

- [ ] Back to the Nike tree: Nike Deutschland GmbH shows ⚠️ 1 (red ring).
- [ ] **Teams**, right panel **Viewing as** › Jonas Becker. One card:
      "Katrin said the 20th, your note says the 15th." › click **Correct**.
- Expect: Jonas's note "Payroll cutoff Germany: the 15th of the month" becomes version 3,
  **"Payroll cutoff Germany: the 20th of the month"**, with the call as source. The leaf turns verified.
- [ ] Switch **Viewing as** back to Lena (me).
- [ ] Sidebar **Outlook**. Katrin's mail "RE: Payroll cutoff Nike Deutschland GmbH" (the 20th) opens by itself.
- Expect: "1 known leaf reconfirmed", the cutoff leaf shows **×2**.

## Scene 4: time slider

- [ ] Nike tree. Drag the slider to **+6 months**.
- Expect: decisions and expertise turn yellow, attention points brown, risks/changes/promises fall (🍂).
  The ×2 cutoff leaf stays on the tree longer than unconfirmed changes.
- [ ] Click **Back to today** before scene 5 (the risk number is read at today).
- The digest (#13) is not built: skip it.

## Scene 5: Jonas changes role → handover

- Expect: the knowledge risk chip now reads **62 %** from Jonas (Germany); Lena's call and 🍃 leaves lowered it.
- [ ] Click **Jonas changed role?**
- Expect: banner "15 leaves and 4 items" only Jonas holds. **Suggested: Lena Vermeulen**.
- [ ] Click **Hand over**. The handover brief opens: key facts (incl. "Payroll cutoff Germany: the 20th of the month"),
      attention points and people to call, each with its source.

## Scene 6: the tree

- [ ] Back to the Nike EMEA tree, still at today. Every leaf is green. Hold the frame.
