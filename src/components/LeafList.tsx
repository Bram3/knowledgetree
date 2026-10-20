import Link from "next/link";
import { Mail, MessageSquare, Phone, Globe, Mic } from "lucide-react";
import type { Channel, Leaf, LeafType } from "@/lib/types";
import { personName } from "./Avatar";
import { fmtDate } from "@/lib/format";
import type { FreshLeaf, Season } from "@/lib/freshness";
import { UsefulButton } from "./UsefulButton";

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

/** Leaf colours by freshness: green, then yellow, then brown; fallen leaves go to the archive. */
export const SEASON_META: Record<Season, { label: string; color: string; border: string }> = {
  green: { label: "Fresh", color: "#059669", border: "border-emerald-200" },
  yellow: { label: "Fading", color: "#ca8a04", border: "border-yellow-300" },
  brown: { label: "Withering", color: "#92400e", border: "border-amber-700/40" },
  fallen: { label: "Fallen", color: "#78716c", border: "border-stone-300" },
};

/** ×n: the same fact heard n times. Each reconfirmation is a deeper green. */
function ReconfirmedLabel({ times, sources = [] }: { times: number; sources?: Leaf["source"][] }) {
  const shade = times >= 4 ? "bg-emerald-800" : times === 3 ? "bg-emerald-700" : "bg-emerald-600";
  const from = sources.map((x) => `${x.channel}${x.from ? ` from ${x.from.replace(/\s*<.*>$/, "")}` : ""}`).join(", ");
  return <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-bold text-white ${shade}`} title={`Heard ${times} times${from ? `, also via ${from}` : ""}`}>×{times}</span>;
}

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
/** With freshness (a FreshLeaf) the card is coloured by season and offers the "Useful" button. */
export function LeafCard({ leaf }: { leaf: Leaf | FreshLeaf }) {
  const ch = CHANNEL_META[leaf.source.channel];
  const fresh = "freshness" in leaf ? leaf : null;
  const s = fresh ? SEASON_META[fresh.season] : null;
  const times = leaf.reconfirmedAt.length + 1;
  const conflict = leaf.status === "conflict";
  const border = leaf.status === "seed" ? "border-dashed border-amber-300" : conflict ? "border-red-300 bg-red-50/40" : s?.border ?? "border-emerald-200";
  return (
    <div className={`fade-up rounded-[8px] border bg-white p-3 ${border} ${fresh?.season === "fallen" ? "opacity-70" : ""}`} style={s || conflict ? { borderLeftWidth: 4, borderLeftColor: conflict ? "#dc2626" : s!.color } : undefined}>
      <div className="flex flex-wrap items-center gap-1.5">
        <LeafTypeBadge type={leaf.type} />
        {leaf.status === "seed" && <span className="text-[10.5px] font-medium text-amber-700">🌱 seed, waiting for a place</span>}
        {conflict && <span className="text-[10.5px] font-semibold text-red-600" title="Contradicts a note; its owner was asked once">⚠️ conflicts with a note{leaf.deferredAt ? " · in the digest" : ", owner asked"}</span>}
        {leaf.status === "verified" && <span className="text-[10.5px] font-semibold text-emerald-700">✓ verified{leaf.verifiedById ? ` by ${personName(leaf.verifiedById)}` : ""}</span>}
        {times > 1 && <ReconfirmedLabel times={times} sources={leaf.reconfirmedBy} />}
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
      {fresh && s && (
        <div className="mt-2 flex items-center gap-2">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-sd-subtle" title={`Freshness ${Math.round(fresh.freshness * 100)}%`}>
            <span className="block h-full rounded-full" style={{ width: `${Math.round(fresh.freshness * 100)}%`, background: s.color }} />
          </span>
          <span className="text-[10.5px] font-medium" style={{ color: s.color }}>{s.label} · {Math.round(fresh.freshness * 100)}%</span>
          <span className="ml-auto"><UsefulButton leafId={leaf.id} count={leaf.usefulCount} /></span>
        </div>
      )}
    </div>
  );
}
