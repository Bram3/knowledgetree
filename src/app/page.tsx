import Link from "next/link";
import { Search as SearchIcon, ChevronRight, Phone, MessageSquare, Clock, User, Paperclip } from "lucide-react";
import { requireUser, accessibleCompanies } from "@/lib/auth";
import { search, nodePath, company, person } from "@/lib/db";
import { KindIcon, ScopeTags, SourceBadge, CategoryChip, OriginBadge, CompanyLogo } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { Markdown } from "@/components/Markdown";
import { stripMarkdown } from "@/lib/text";
import { ViewDocumentButton } from "@/components/DocumentViewer";
import { fmtDate, COUNTRY_NAME, COUNTRIES, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const suggestions = ["payroll cutoff Nike Germany", "shift premiums Laakdal", "30% ruling Nike Hilversum", "flexi-jobs Van der Valk", "headcount report VRT", "Kurzarbeit ArcelorMittal Bremen", "club manager bonus Basic-Fit"];

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const sp = (await searchParams) as { q?: string; company?: string; country?: string };
  const q = sp.q?.trim() ?? "";
  const companies = accessibleCompanies(user);
  const companyIds = companies.map((c) => c.id);
  const hits = q ? search(q, { companyIds, companyId: sp.company || undefined, country: sp.country || undefined }) : [];
  const best = hits.find((h) => h.item.status === "active");
  const mySuggestions = suggestions.filter((s) => companies.some((c) => c.keywords.some((k) => s.toLowerCase().includes(k))));

  return (
    <div className={`mx-auto max-w-4xl ${q ? "space-y-6" : "flex min-h-[70vh] flex-col justify-center"}`}>
      {!q && (
        <div className="mb-8">
          <h1 className="text-[30px] font-semibold tracking-tight">What do you need to know, {user.name.split(" ")[0]}?</h1>
          <p className="mt-2 text-[15px] text-sd-muted">Search across your {companies.length} customers. Every answer shows the entity it belongs to, its owner and its history.</p>
        </div>
      )}

      <form className="card p-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <SearchIcon className="h-5 w-5 text-sd-muted" />
          <input name="q" defaultValue={q} placeholder="e.g. payroll cutoff Nike Germany" className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-slate-400" autoFocus autoComplete="off" />
          <button className="btn-primary px-4 py-2 text-[13.5px]">Search</button>
        </div>
        <div className="flex items-center gap-2 border-t border-sd-border px-3 pt-2.5 pb-1 text-[12.5px]">
          <span className="text-sd-muted">Context</span>
          <select name="company" defaultValue={sp.company ?? ""} className="input px-2 py-1">
            <option value="">All my customers</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="country" defaultValue={sp.country ?? ""} className="input px-2 py-1">
            <option value="">Any country</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{COUNTRY_NAME[c]}</option>)}
          </select>
        </div>
      </form>

      {!q && (
        <div className="mt-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sd-muted">Try</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {mySuggestions.map((s) => <Link key={s} href={`/?q=${encodeURIComponent(s)}`} className="btn-secondary px-3 py-1.5 text-[13px] font-normal">{s}</Link>)}
          </div>
          <div className="mt-10 grid grid-cols-5 gap-3">
            {companies.map((c) => (
              <Link key={c.id} href={`/customers/${c.id}`} className="card flex items-center gap-3 p-3 transition hover:border-sd-navy">
                <CompanyLogo name={c.name} accent={c.accent} logoUrl={c.logoUrl} size={34} />
                <span className="min-w-0"><span className="block truncate text-[13px] font-medium">{c.name}</span><span className="block text-[11px] text-sd-muted">{c.industry}</span></span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {q && !hits.length && <div className="card p-8 text-center text-[14px] text-sd-muted">Nothing found for “{q}” in your customers. Try fewer words or another context.</div>}

      {best && (() => { const c = company(best.node.companyId)!; return (
        <div className="card fade-up overflow-hidden">
          <div className="flex items-center gap-3 border-b border-sd-border bg-sd-subtle px-5 py-2.5">
            <CompanyLogo name={c.name} accent={c.accent} logoUrl={c.logoUrl} size={24} />
            <span className="flex items-center gap-1 text-[12px] text-sd-muted">{nodePath(best.node.id).map((p, i) => <span key={p.id} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{p.name}</span>)}</span>
            <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.12em] text-sd-primary">Best match</span>
          </div>
          <div className="grid grid-cols-3 gap-6 p-5">
            <div className="col-span-2">
              <div className="flex flex-wrap items-center gap-1.5"><CategoryChip id={best.item.category} /><OriginBadge origin={best.item.origin} /><SourceBadge source={best.item.source} /><ScopeTags scope={best.item.scope} /></div>
              <h2 className="mt-2 flex items-center gap-2 text-[19px] font-semibold"><KindIcon kind={best.item.kind} fileName={best.item.fileName} className="h-5 w-5" /> {best.item.title}</h2>
              {best.item.kind === "note" ? <Markdown className="mt-3 text-[14px]">{best.item.content}</Markdown> : <p className="mt-3 text-[14.5px] leading-relaxed text-sd-text">{best.item.content}</p>}
              {best.item.fileName && <div className="mt-3 inline-flex items-center gap-1.5 rounded-[4px] bg-sd-subtle px-2.5 py-1.5 text-[12px] text-sd-muted"><Paperclip className="h-3.5 w-3.5" /> {best.item.fileName} · {best.item.fileSize}</div>}
              <div className="mt-4 flex items-center gap-2">{best.item.kind === "file" && (best.item.fileUrl || best.item.previewUrl) && <ViewDocumentButton doc={{ title: best.item.title, fileName: best.item.fileName, fileSize: best.item.fileSize, fileUrl: best.item.fileUrl, previewUrl: best.item.previewUrl }} className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px]" label="View document" />}<Link href={`/customers/${best.node.companyId}?node=${best.node.id}&cat=${best.item.category}&item=${best.item.id}`} className="btn-secondary inline-block px-3.5 py-1.5 text-[13px]">Open in the tree</Link></div>
            </div>
            <div className="space-y-3 border-l border-sd-border pl-5 text-[12.5px]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sd-muted">Provenance</div>
              <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-sd-muted" /><span>Owner <b>{person(best.item.ownerId)?.name ?? "—"}</b></span></div>
              <div className="flex items-start gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 text-sd-muted" /><span>Version {best.item.versions.length}, {timeAgo(best.item.updatedAt)} by {person(best.item.versions.at(-1)?.byId)?.name}<span className="block text-sd-muted">{fmtDate(best.item.updatedAt)}</span></span></div>
              {(() => { const e = person(best.node.expertIds[0] ?? best.item.ownerId); return e ? (
                <div className="rounded-[4px] bg-sd-subtle p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sd-muted">Expert for this entity</div>
                  <div className="mt-2 flex items-center gap-2"><Avatar id={e.id} size="sm" /><div><div className="font-medium">{e.name}</div><div className="text-[11px] text-sd-muted">{e.role}</div></div><span className="ml-auto flex gap-1"><button className="btn-secondary p-1.5"><MessageSquare className="h-3.5 w-3.5" /></button><button className="btn-secondary p-1.5"><Phone className="h-3.5 w-3.5" /></button></span></div>
                </div>) : null; })()}
            </div>
          </div>
        </div>
      ); })()}

      {hits.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold text-sd-muted">{hits.length - 1} more result{hits.length > 2 ? "s" : ""}</h3>
          {hits.slice(1).map((h) => {
            const c = company(h.node.companyId);
            return (
              <Link key={h.item.id} href={`/customers/${h.node.companyId}?node=${h.node.id}&cat=${h.item.category}&item=${h.item.id}`} className={`card flex items-center gap-4 px-4 py-3 transition hover:border-sd-navy ${h.item.status === "superseded" ? "opacity-60" : ""}`}>
                <KindIcon kind={h.item.kind} fileName={h.item.fileName} className="h-5 w-5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[14px] font-medium">{h.item.title}{h.item.status === "superseded" && <span className="rounded-[4px] bg-sd-subtle px-1.5 py-0.5 text-[10.5px] font-semibold uppercase text-sd-muted">superseded</span>}</div>
                  <div className="truncate text-[12.5px] text-sd-muted">{c?.name} › {nodePath(h.node.id).slice(1).map((p) => p.name).join(" › ")} · {stripMarkdown(h.item.content)}</div>
                </div>
                <CategoryChip id={h.item.category} />
                <span className="w-28 text-right text-[11.5px] text-sd-muted">{person(h.item.ownerId)?.name.split(" ")[0]} · {timeAgo(h.item.updatedAt)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
