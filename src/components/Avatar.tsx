import { seed } from "@/lib/seed";

const sizes = { xs: "h-5 w-5 text-[9px]", sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-[12px]", lg: "h-12 w-12 text-[15px]" };

export function Avatar({ id, size = "md", className = "" }: { id: string | null | undefined; size?: keyof typeof sizes; className?: string }) {
  const p = seed.people.find((x) => x.id === id);
  if (!p) return <span className={`grid shrink-0 place-items-center rounded-full bg-slate-200 font-semibold text-slate-500 ${sizes[size]} ${className}`}>?</span>;
  return <span title={p.name} className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-white ${p.color} ${sizes[size]} ${className}`}>{p.initials}</span>;
}

export function personName(id: string | null | undefined) {
  return seed.people.find((x) => x.id === id)?.name ?? "Unknown";
}
