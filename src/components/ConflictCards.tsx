"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { answerConflict, conflictCards, viewAsOptions } from "@/lib/leaf-actions";
import type { ConflictCard, ConflictChoice } from "@/lib/compare";

type ViewAs = Awaited<ReturnType<typeof viewAsOptions>>[number];

const ANSWERS: { choice: ConflictChoice; label: string; done: string; primary?: boolean }[] = [
  { choice: "correct", label: "Correct", done: "Note updated with the new source. Thanks!", primary: true },
  { choice: "keep", label: "Keep mine", done: "Kept your note. The leaf fell." },
  { choice: "unsure", label: "Not sure", done: "Moved to your weekly digest." },
];

/**
 * KnowledgeTree's only interruption: one card per conflict, for the owner of the contradicted note.
 * "Viewing as" lets the demo show Jonas's card without logging out (people who share a customer with you only).
 */
export function ConflictCards() {
  const [people, setPeople] = useState<ViewAs[]>([]);
  const [viewAs, setViewAs] = useState<string | undefined>(undefined);
  const meId = people.find((p) => p.me)?.id;
  const [cards, setCards] = useState<ConflictCard[] | null>(null);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const load = useCallback((as?: string) => {
    conflictCards(as).then(setCards, () => setCards([]));
  }, []);

  useEffect(() => {
    viewAsOptions().then(setPeople, () => setPeople([]));
  }, []);
  useEffect(() => {
    load(viewAs);
    const onFocus = () => load(viewAs);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [viewAs, load]);

  const answer = (c: ConflictCard, a: (typeof ANSWERS)[number]) =>
    start(async () => {
      await answerConflict(c.leaf.id, a.choice, viewAs);
      setAnswered((m) => ({ ...m, [c.leaf.id]: a.done }));
    });

  const me = people.find((p) => p.id === viewAs);
  const open = (cards ?? []).filter((c) => !answered[c.leaf.id]);
  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-[#e0e0e0] bg-[#fafafa]">
      <div className="border-b border-[#e0e0e0] px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold"><span className="grid h-6 w-6 place-items-center rounded-md bg-sd-dark text-white"><span className="text-[9px] font-bold">SD</span></span> KnowledgeTree</div>
        <label className="mt-2 flex items-center gap-2 text-[11.5px] text-[#616161]">
          Viewing as
          <select value={viewAs ?? meId ?? ""} onChange={(e) => { setCards(null); setAnswered({}); setViewAs(e.target.value === meId ? undefined : e.target.value || undefined); }} className="flex-1 rounded-md border border-[#e0e0e0] bg-white px-2 py-1 text-[12px] text-[#242424] outline-none focus:border-[#5b5fc7]">
            {!people.length && <option value="">me</option>}
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.me ? " (me)" : ""}</option>)}
          </select>
        </label>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {cards === null ? (
          <div className="text-[12px] text-[#616161]">Checking…</div>
        ) : (
          <>
            {Object.entries(answered).map(([id, msg]) => <div key={id} className="fade-up rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">✓ {msg}</div>)}
            {open.length === 0 && !Object.keys(answered).length && <div className="rounded-lg border border-dashed border-[#e0e0e0] bg-white px-3 py-3 text-[12px] text-[#616161]">Nothing needs {me && !me.me ? me.name.split(" ")[0] : "you"}. KnowledgeTree only asks when human judgement adds value.</div>}
            {open.map((c) => (
              <div key={c.leaf.id} className="fade-up overflow-hidden rounded-lg border border-red-200 bg-white shadow-sm">
                <div className="bg-red-50 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-red-700">⚠️ One question for you</div>
                <div className="p-3">
                  <div className="text-[14px] font-semibold leading-snug">{c.text}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">{c.path.map((p, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{p}</span>)}</div>
                  <blockquote className="mt-2 border-l-2 border-red-300 pl-2 text-[12px] italic text-slate-700">“{c.leaf.quote}”</blockquote>
                  <div className="mt-1 text-[11px] text-slate-500">{c.leaf.source.channel} · {c.leaf.source.from?.replace(/\s*<.*>$/, "") ?? "unknown"}{c.leaf.reconfirmedAt.length ? ` · heard ×${c.leaf.reconfirmedAt.length + 1}` : ""}</div>
                  <Link href={`/customers/${c.companyId}?node=${c.leaf.nodeId}&cat=${c.leaf.category}&item=${c.note.id}`} className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-sd-primary underline">Your note: {c.note.title} (v{c.note.version}) <ExternalLink className="h-3 w-3" /></Link>
                  <div className="mt-3 flex gap-1.5">
                    {ANSWERS.map((a) => (
                      <button key={a.choice} disabled={pending} onClick={() => answer(c, a)} className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium disabled:opacity-50 ${a.primary ? "bg-[#5b5fc7] text-white" : "border border-[#e0e0e0] text-[#242424] hover:bg-[#f5f5f5]"}`}>{a.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
