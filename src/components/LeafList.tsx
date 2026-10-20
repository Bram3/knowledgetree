import Link from "next/link";
import { Mail, MessageSquare, Phone, Globe, Mic } from "lucide-react";
import type { Channel, Leaf, LeafType } from "@/lib/types";
import { personName } from "./Avatar";
import { fmtDate } from "@/lib/format";

export const LEAF_TYPE_META: Record<LeafType, { label: string; icon: string; color: string }> = {
  attention: { label: "Attention point", icon: "⚠️", color: "#b45309" },
  change: { label: "Change", icon: "🔄", color: "#006dd8" },
  decision: { label: "Decision", icon: "🧭", color: "#7c3aed" },
  promise: { label: "Promise", icon: "🤝", color: "#0f766e" },
  expertise: { label: "Expertise", icon: "👤", color: "#4b5563" },
  risk: { label: "Customer risk", icon: "📉", color: "#dc2626" },
};

const CHANNEL_META: Record<Channel, { label: string; Icon: typeof Mail }> = {
  mail: { label: "Mail", Icon: Mail },
  teams: { label: "Teams", Icon: MessageSquare },
  call: { label: "Call", Icon: Phone },
  browser: { label: "Browser", Icon: Globe },
  voice: { label: "Voice note", Icon: Mic },
};

/** Link back to the message a leaf came from, for channels whose mock can show it (Teams: `teams:<message id>`). */
function sourceHref(leaf: Leaf) {
  const m = /^teams:([\w-]+)$/.exec(leaf.source.ref);
  return leaf.source.channel === "teams" && m ? `/teams#${m[1]}` : null;
}

export function LeafTypeBadge({ type }: { type: LeafType }) {
  const m = LEAF_TYPE_META[type];
  return <span className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: `${m.color}14`, color: m.color }}>{m.icon} {m.label}</span>;
}

/** One leaf: statement, why, the literal quote, where and when it was caught, who said it, and how sure we are. */
export function LeafCard({ leaf }: { leaf: Leaf }) {
  const ch = CHANNEL_META[leaf.source.channel];
  return (
    <div className={`fade-up rounded-[8px] border bg-white p-3 ${leaf.status === "seed" ? "border-dashed border-amber-300" : "border-emerald-200"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <LeafTypeBadge type={leaf.type} />
        {leaf.status === "seed" && <span className="text-[10.5px] font-medium text-amber-700">🌱 seed, waiting for a place</span>}
        <span className="ml-auto text-[10.5px] font-semibold text-sd-muted" title="Confidence">{Math.round(leaf.confidence * 100)}%</span>
      </div>
      <div className="mt-1.5 text-[13px] font-medium leading-snug">{leaf.statement}</div>
      {leaf.why && <div className="mt-0.5 text-[12px] text-sd-muted">Why: {leaf.why}</div>}
      <blockquote className="mt-2 border-l-2 border-emerald-300 pl-2 text-[12px] italic text-sd-text">“{leaf.quote}”</blockquote>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-sd-muted">
        {sourceHref(leaf)
          ? <Link href={sourceHref(leaf)!} className="inline-flex items-center gap-1 underline decoration-dotted hover:text-sd-primary" title="Open the message this leaf came from"><ch.Icon className="h-3 w-3" /> {ch.label}{leaf.source.trigger === "reaction" ? " · 🍃 reaction" : ""}</Link>
          : <span className="inline-flex items-center gap-1"><ch.Icon className="h-3 w-3" /> {ch.label}{leaf.source.trigger === "reaction" ? " · 🍃 reaction" : ""}</span>}
        <span>· {fmtDate(leaf.source.at)}</span>
        {leaf.source.from && <span>· said by {leaf.source.from.replace(/\s*<.*>$/, "")}</span>}
        <span>· caught for {personName(leaf.source.byId)}</span>
      </div>
    </div>
  );
}
