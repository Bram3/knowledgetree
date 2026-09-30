import { FileText, StickyNote, MessageSquare, Mail, FileSpreadsheet, Presentation, File, Building2, ArrowDownLeft } from "lucide-react";
import { product } from "@/lib/catalog";

export function ScopeTags({ scope }: { scope: string[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {scope.map((s) => (
        <span key={s} className="inline-flex items-center rounded-[4px] border border-sd-border bg-white px-1.5 py-0.5 font-mono text-[10.5px] font-medium tracking-wide text-sd-muted">{s === "all" ? "ALL" : s}</span>
      ))}
    </span>
  );
}

export function CategoryChip({ id, size = "sm" }: { id: string; size?: "sm" | "md" }) {
  const p = product(id);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] font-medium ${size === "md" ? "px-2 py-1 text-[12px]" : "px-1.5 py-0.5 text-[11px]"}`} style={{ background: `${p.color}14`, color: p.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} /> {p.name}
    </span>
  );
}

export function OriginBadge({ origin }: { origin: "sdworx" | "customer" }) {
  return origin === "customer"
    ? <span className="inline-flex items-center gap-1 rounded-[4px] bg-sd-gold/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"><ArrowDownLeft className="h-3 w-3" /> from customer</span>
    : <span className="inline-flex items-center gap-1 rounded-[4px] bg-sd-navy/10 px-1.5 py-0.5 text-[11px] font-medium text-sd-navy"><Building2 className="h-3 w-3" /> SD Worx</span>;
}

export function KindIcon({ kind, fileName, className = "h-4 w-4" }: { kind: "file" | "note"; fileName?: string; className?: string }) {
  if (kind === "note") return <StickyNote className={`${className} text-sd-gold`} />;
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "csv") return <FileSpreadsheet className={`${className} text-emerald-600`} />;
  if (ext === "pptx") return <Presentation className={`${className} text-orange-500`} />;
  if (ext === "pdf") return <FileText className={`${className} text-red-500`} />;
  if (ext === "docx") return <FileText className={`${className} text-sky-600`} />;
  return <File className={`${className} text-sd-muted`} />;
}

export function SourceBadge({ source }: { source: { type: string; ref: string } }) {
  if (source.type === "teams") return <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#5b5fc7]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#5b5fc7]"><MessageSquare className="h-3 w-3" /> from Teams</span>;
  if (source.type === "outlook") return <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#0f6cbd]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#0f6cbd]"><Mail className="h-3 w-3" /> from Outlook</span>;
  return null;
}

/** Company logo: the real logo when available, otherwise a generated monogram. */
export function CompanyLogo({ name, accent, logoUrl, size = 40 }: { name: string; accent: string; logoUrl?: string; size?: number }) {
  const words = name.replace(/[^A-Za-z0-9 -]/g, "").split(/[\s-]+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
  if (logoUrl) {
    return (
      <span className="grid shrink-0 place-items-center overflow-hidden border border-sd-border bg-white" style={{ width: size, height: size, borderRadius: Math.round(size * 0.18), padding: Math.round(size * 0.12) }} aria-label={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name} className="h-full w-full object-contain" />
      </span>
    );
  }
  return (
    <span className="grid shrink-0 place-items-center font-semibold tracking-tight text-white" style={{ width: size, height: size, borderRadius: Math.round(size * 0.18), background: accent, fontSize: Math.round(size * 0.38) }} aria-label={name}>
      {initials}
    </span>
  );
}
