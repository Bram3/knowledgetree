"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Send, Sparkles, X, Check } from "lucide-react";
import { answerSecondThought, checkDraftText } from "@/lib/second-thought-actions";
import { rewriteClaim } from "@/lib/second-thought-prompt";
import { DEMO_DRAFT } from "@/lib/demo-draft";
import type { SecondThought } from "@/lib/second-thought";

/** Check after this long without typing, and again on Send. */
const PAUSE_MS = 1200;
const bare = (s: string) => s.replace(/^the\s+/i, "");
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
const CHANNEL: Record<string, string> = { mail: "email", call: "call", teams: "Teams message", browser: "web page", voice: "voice note" };

/**
 * #19 Second thought: compose mode of the Outlook mock. Leafe reads the draft on a typing pause and on Send, and
 * shows one calm card when a claim contradicts a leaf on the recipient's branch. The answer is the verification.
 */
export function OutlookCompose({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState(DEMO_DRAFT.to);
  const [subject, setSubject] = useState(DEMO_DRAFT.subject);
  const [text, setText] = useState("");
  const [ref] = useState(() => `draft:${Math.random().toString(36).slice(2, 10)}`);
  const [thoughts, setThoughts] = useState<SecondThought[]>([]);
  const [handled, setHandled] = useState<Record<string, string>>({}); // key → what happened ("" = ignored)
  const [checking, setChecking] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const typing = useRef<ReturnType<typeof setInterval> | null>(null);
  const latest = useRef(0);

  const check = useCallback(async (draft: { to: string; subject: string; text: string }) => {
    const n = ++latest.current;
    setChecking(true);
    try {
      const found = await checkDraftText(draft);
      if (n === latest.current) setThoughts(found);
      return found;
    } catch {
      return [];
    } finally {
      if (n === latest.current) setChecking(false);
    }
  }, []);

  // Typing pause: check the draft once the presenter stops typing.
  useEffect(() => {
    if (!text.trim()) return;
    const t = setTimeout(() => void check({ to, subject, text }), PAUSE_MS);
    return () => clearTimeout(t);
  }, [to, subject, text, check]);

  useEffect(() => () => { if (typing.current) clearInterval(typing.current); }, []);

  const open = thoughts.filter((t) => !(t.key in handled) && text.includes(t.sentence));

  const typeDemo = () => {
    if (typing.current) clearInterval(typing.current);
    let i = 0;
    setText("");
    typing.current = setInterval(() => {
      i += 2;
      setText(DEMO_DRAFT.text.slice(0, i));
      if (i >= DEMO_DRAFT.text.length && typing.current) clearInterval(typing.current);
    }, 30);
  };

  const send = () => start(async () => {
    const found = await check({ to, subject, text });
    if (!found.some((t) => !(t.key in handled))) setSent(true);
  });

  const answer = (t: SecondThought, choice: "change" | "mine" | "ignore") => start(async () => {
    if (choice === "ignore") {
      setHandled((h) => ({ ...h, [t.key]: "" }));
      return;
    }
    await answerSecondThought({ choice, ref, to, leafId: t.leafId, sentence: t.sentence, claim: t.claim, said: t.said, noted: t.noted });
    if (choice === "change") setText((cur) => rewriteClaim(cur, t));
    setHandled((h) => ({ ...h, [t.key]: choice === "change" ? `Changed to ${bare(t.noted)}. The leaf is reconfirmed (×${t.times + 1}).` : `Kept ${bare(t.said)}. New leaf caught; the old one is in doubt and its owner gets one question.` }));
  });

  if (sent) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-white text-[14px] text-[#605e5c]">
        <Check className="h-8 w-8 text-emerald-600" /> Sent to {to}.
        <button onClick={onClose} className="rounded border border-[#e1dfdd] px-3 py-1.5 text-[13px] text-[#242424] hover:bg-[#f3f2f1]">Back to inbox</button>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex items-center gap-2 border-b border-[#e1dfdd] px-4 py-2 text-[12.5px]">
          <button onClick={send} disabled={pending || !text.trim()} className="inline-flex items-center gap-1.5 rounded bg-[#0f6cbd] px-3 py-1.5 font-medium text-white hover:bg-[#115ea3] disabled:opacity-50"><Send className="h-4 w-4" /> Send</button>
          <button onClick={typeDemo} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[#605e5c] hover:bg-[#f3f2f1]" title="Types the demo draft for scene 2b"><Sparkles className="h-4 w-4" /> Type demo draft</button>
          <button onClick={onClose} className="ml-auto rounded p-1 text-[#605e5c] hover:bg-[#f3f2f1]" aria-label="Discard draft"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-1 flex-col px-7 py-4">
          <label className="flex items-center gap-3 border-b border-[#e1dfdd] py-2 text-[13.5px]"><span className="w-14 text-[#605e5c]">To</span><input value={to} onChange={(e) => setTo(e.target.value)} maxLength={200} className="flex-1 outline-none" /></label>
          <label className="flex items-center gap-3 border-b border-[#e1dfdd] py-2 text-[13.5px]"><span className="w-14 text-[#605e5c]">Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className="flex-1 font-semibold outline-none" /></label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} placeholder="Write your mail…" className="mt-4 flex-1 resize-none font-sans text-[13.5px] leading-relaxed outline-none" />
        </div>
      </div>
      <div className="flex w-[320px] flex-col border-l border-[#e1dfdd] bg-[#faf9f8]">
        <div className="flex items-center gap-2 border-b border-[#e1dfdd] bg-white px-4 py-3"><span className="grid h-7 w-7 place-items-center rounded-md bg-sd-dark text-white"><span className="text-[10px] font-bold">SD</span></span><span className="text-[14px] font-semibold">KnowledgeTree</span><span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">ADD-IN</span></div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Second thought</div>
          {Object.values(handled).filter(Boolean).map((msg, i) => <div key={i} className="fade-up rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">✓ {msg}</div>)}
          {open.map((t) => (
            <div key={t.key} className="fade-up overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm">
              <div className="p-3">
                <div className="text-[14px] font-semibold">Are you sure?</div>
                <div className="mt-1 text-[12.5px] leading-snug text-sd-text">You wrote {t.said}. A leaf on {t.path[t.path.length - 1]} says it&apos;s {t.noted}.</div>
                <div className="mt-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-[12px] text-emerald-900">🍃 {t.statement}</div>
                <div className="mt-1.5 text-[11px] text-slate-500">Source: {CHANNEL[t.source.channel] ?? t.source.channel} from {t.source.from}, {day(t.source.at)} · confirmed {t.times} times</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button disabled={pending} onClick={() => answer(t, "change")} className="rounded-md bg-[#0f6cbd] px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-[#115ea3] disabled:opacity-50">Change to {bare(t.noted)}</button>
                  <button disabled={pending} onClick={() => answer(t, "mine")} className="rounded-md border border-[#e1dfdd] px-2.5 py-1.5 text-[12px] font-medium hover:bg-[#f3f2f1] disabled:opacity-50">{bare(t.said)} is correct</button>
                  <button disabled={pending} onClick={() => answer(t, "ignore")} className="rounded-md px-2.5 py-1.5 text-[12px] text-[#605e5c] hover:bg-[#f3f2f1] disabled:opacity-50">Ignore</button>
                </div>
              </div>
            </div>
          ))}
          {!open.length && !Object.values(handled).some(Boolean) && (
            <div className="rounded-lg border border-dashed border-sd-border bg-white px-3 py-2.5 text-[12px] text-slate-500">{checking ? "Reading your draft…" : "Leafe reads along and checks your facts against the leaves when you pause or press Send."}</div>
          )}
        </div>
      </div>
    </>
  );
}
