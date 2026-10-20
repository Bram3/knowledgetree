"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { undoLeaves, type IngestedLeaf } from "@/lib/leaf-actions";

/**
 * The calm "🍃 n leaves caught" toast with undo, for channels that capture without a click (call, voice note).
 * Pass what `ingestText`/`endDemoCall` returned. Undo deletes exactly those leaves; `onUndone` lets the
 * caller reset its own state. The toast closes by itself after `autoHideMs` unless the pointer is on it.
 */
export type CaughtLeaves = { leaves: Pick<IngestedLeaf, "id" | "nodeId" | "category" | "status" | "path">[]; companyId: string | null };

export function LeafToast({ caught, onClose, onUndone, autoHideMs = 12000 }: { caught: CaughtLeaves | null; onClose: () => void; onUndone?: () => void; autoHideMs?: number }) {
  const [state, setState] = useState<"shown" | "undone" | "failed">("shown");
  const [hovered, setHovered] = useState(false);
  const [pending, start] = useTransition();
  const [shownFor, setShownFor] = useState(caught);
  if (shownFor !== caught) {
    // A new capture replaces the toast: reset its state.
    setShownFor(caught);
    setState("shown");
  }

  useEffect(() => {
    if (!caught || hovered || pending) return;
    const t = setTimeout(onClose, state === "undone" ? 2500 : autoHideMs);
    return () => clearTimeout(t);
  }, [caught, hovered, pending, state, autoHideMs, onClose]);

  if (!caught) return null;
  const n = caught.leaves.length;
  const first = caught.leaves[0];
  const seeds = n > 0 && caught.leaves.every((l) => l.status === "seed");
  const undo = () => start(async () => {
    try {
      await undoLeaves(caught.leaves.map((l) => l.id));
      setState("undone");
      onUndone?.();
    } catch {
      setState("failed");
    }
  });

  return (
    <div role="status" aria-live="polite" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="fade-up fixed bottom-6 right-6 z-50 w-[360px] rounded-[6px] border border-emerald-200 bg-white px-4 py-3 text-[13px] shadow-lg">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {state === "undone" ? (
            <div className="font-medium text-sd-text">Undone. {n === 1 ? "That leaf is" : `Those ${n} leaves are`} gone.</div>
          ) : n === 0 ? (
            <div className="font-medium text-sd-text">Nothing to keep in this one.</div>
          ) : (
            <>
              <div className="font-medium text-sd-text">{seeds ? "🌱" : "🍃"} {n} {n === 1 ? "leaf" : "leaves"} caught</div>
              {first && caught.companyId && (
                <Link href={`/customers/${caught.companyId}?node=${first.nodeId}&cat=${first.category}`} className="mt-0.5 flex flex-wrap items-center gap-1 text-[11.5px] text-emerald-800 hover:underline">
                  {first.path.map((p, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{p}</span>)}
                </Link>
              )}
              {state === "failed" && <div className="mt-1 text-[11.5px] text-rose-700">Could not undo. Try again.</div>}
            </>
          )}
        </div>
        {state !== "undone" && n > 0 && (
          <button onClick={undo} disabled={pending} className="rounded-[4px] px-2 py-1 text-[12.5px] font-semibold text-sd-primary hover:bg-sd-subtle disabled:opacity-50">{pending ? "Undoing…" : "Undo"}</button>
        )}
        <button onClick={onClose} aria-label="Close" className="rounded-[4px] p-1 text-sd-muted hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
