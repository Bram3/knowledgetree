import Link from "next/link";
import { Search as SearchIcon, ChevronRight } from "lucide-react";
import { requireUser, accessibleCompanies } from "@/lib/auth";
import { companySummary, person, companyCategories } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
import { CompanyLogo } from "@/components/ui";
import { COUNTRY_NAME, timeAgo } from "@/lib/format";
import { PRODUCTS } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Customers({ searchParams }: PageProps<"/customers">) {
  const user = await requireUser();
  const sp = (await searchParams) as { q?: string; industry?: string; country?: string; product?: string };
  const all = accessibleCompanies(user).map((c) => ({ c, s: companySummary(c.id) }));
  const industries = [...new Set(all.map((x) => x.c.industry))].sort();
  const countries = [...new Set(all.flatMap((x) => x.s.countries))].sort();
  const q = sp.q?.toLowerCase().trim() ?? "";
  const rows = all.filter(({ c, s }) =>
    (!q || c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)) &&
    (!sp.industry || c.industry === sp.industry) &&
    (!sp.country || s.countries.includes(sp.country)) &&
    (!sp.product || c.products.includes(sp.product))
  );
  const hasFilter = q || sp.industry || sp.country || sp.product;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-[14px] text-sd-muted">{all.length} customer{all.length === 1 ? "" : "s"} assigned to you.</p>
        </div>
      </header>

      <form className="card flex flex-wrap items-center gap-2 p-2.5">
        <div className="input flex min-w-[240px] flex-1 items-center gap-2 px-3 py-2 focus-within:border-sd-navy">
          <SearchIcon className="h-4 w-4 text-sd-muted" />
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Search customers" className="flex-1 bg-transparent text-[13.5px] outline-none" autoComplete="off" />
        </div>
        <select name="industry" defaultValue={sp.industry ?? ""} className="input px-2.5 py-2 text-[13px]">
          <option value="">All industries</option>
          {industries.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select name="country" defaultValue={sp.country ?? ""} className="input px-2.5 py-2 text-[13px]">
          <option value="">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{COUNTRY_NAME[c] ?? c}</option>)}
        </select>
        <select name="product" defaultValue={sp.product ?? ""} className="input px-2.5 py-2 text-[13px]">
          <option value="">All products</option>
          {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn-primary px-3.5 py-2 text-[13px]">Apply</button>
        {hasFilter && <Link href="/customers" className="px-2 text-[13px] text-sd-muted hover:text-sd-text">Clear</Link>}
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-sd-subtle text-[11px] font-semibold uppercase tracking-[0.1em] text-sd-muted">
            <tr><th className="px-5 py-2.5">Customer</th><th className="px-3 py-2.5">Products</th><th className="px-3 py-2.5">Countries</th><th className="px-3 py-2.5">Entities</th><th className="px-3 py-2.5">Items</th><th className="px-3 py-2.5">Account lead</th><th className="px-3 py-2.5">Last change</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-sd-border">
            {rows.map(({ c, s }) => (
              <tr key={c.id} className="group transition hover:bg-sd-subtle">
                <td className="px-5 py-3">
                  <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                    <CompanyLogo name={c.name} accent={c.accent} logoUrl={c.logoUrl} size={36} />
                    <span><span className="block font-semibold text-sd-text group-hover:text-sd-primary">{c.name}</span><span className="block text-[11.5px] text-sd-muted">{c.industry} · since {c.since}</span></span>
                  </Link>
                </td>
                <td className="px-3 py-3"><span className="flex flex-wrap gap-1">{companyCategories(c.id).map((p) => <span key={p.id} title={p.name} className="rounded-[4px] px-1.5 py-0.5 font-mono text-[10.5px] font-semibold" style={{ background: `${p.color}18`, color: p.color }}>{p.short}</span>)}</span></td>
                <td className="px-3 py-3 text-sd-muted">{s.countries.map((x) => COUNTRY_NAME[x] ?? x).join(", ")}</td>
                <td className="px-3 py-3 text-sd-muted">{s.nodes}</td>
                <td className="px-3 py-3 text-sd-muted">{s.items}</td>
                <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-sd-muted"><Avatar id={c.accountLeadId} size="xs" /> {person(c.accountLeadId)?.name}</span></td>
                <td className="px-3 py-3 text-sd-muted">{s.lastUpdated ? <>{timeAgo(s.lastUpdated)}<div className="text-[11.5px] text-slate-400">by {s.lastUpdatedBy}</div></> : "—"}</td>
                <td className="px-3 py-3"><Link href={`/customers/${c.id}`} className="text-slate-300 group-hover:text-sd-primary"><ChevronRight className="h-4 w-4" /></Link></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="px-5 py-8 text-center text-sd-muted">No customers match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
