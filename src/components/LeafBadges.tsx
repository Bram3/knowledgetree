import type { Leaf, LeafType } from "@/lib/types";

/**
 * Small leaf labels shared by every place that shows leaves (tree panel, Outlook, Teams, the toast).
 * Client-safe: no store or Node imports.
 */

export const LEAF_TYPE_META: Record<LeafType, { label: string; icon: string; color: string }> = {
  attention: { label: "Attention point", icon: "⚠️", color: "#b45309" },
  change: { label: "Change", icon: "🔄", color: "#006dd8" },
  decision: { label: "Decision", icon: "🧭", color: "#7c3aed" },
  promise: { label: "Promise", icon: "🤝", color: "#0f766e" },
  expertise: { label: "Expertise", icon: "👤", color: "#4b5563" },
  risk: { label: "Customer risk", icon: "📉", color: "#dc2626" },
};

export function LeafTypeBadge({ type }: { type: LeafType }) {
  const m = LEAF_TYPE_META[type];
  return <span className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: `${m.color}14`, color: m.color }}>{m.icon} {m.label}</span>;
}

/** "1 leaf", "3 leaves" (with an optional adjective: "2 known leaves"). */
export function leavesLabel(n: number, adjective = "") {
  return `${n} ${adjective ? `${adjective} ` : ""}${n === 1 ? "leaf" : "leaves"}`;
}

/** 🌱 when every leaf is a seed (no place yet), else 🍃. */
export function leafIcon(leaves: Pick<Leaf, "status">[]) {
  return leaves.length > 0 && leaves.every((l) => l.status === "seed") ? "🌱" : "🍃";
}

/** Seed or conflict marker next to the type badge. Nothing for an ordinary leaf. */
export function LeafStatusBadge({ leaf }: { leaf: Pick<Leaf, "status" | "deferredAt"> }) {
  if (leaf.status === "seed") return <span className="text-[10.5px] font-medium text-amber-700">🌱 seed, waiting for a place</span>;
  if (leaf.status === "conflict")
    return <span className="text-[10.5px] font-semibold text-red-600" title="Contradicts a note; its owner was asked once">⚠️ conflicts with a note{leaf.deferredAt ? " · in the digest" : ", owner asked"}</span>;
  return null;
}

/** ×n: the same fact heard n times. Each reconfirmation is a deeper green. */
export function ReconfirmedLabel({ times, sources = [] }: { times: number; sources?: Leaf["source"][] }) {
  const shade = times >= 4 ? "bg-emerald-800" : times === 3 ? "bg-emerald-700" : "bg-emerald-600";
  const from = sources.map((x) => `${x.channel}${x.from ? ` from ${x.from.replace(/\s*<.*>$/, "")}` : ""}`).join(", ");
  return <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-bold text-white ${shade}`} title={`Heard ${times} times${from ? `, also via ${from}` : ""}`}>×{times}</span>;
}
