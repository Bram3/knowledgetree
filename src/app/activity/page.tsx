import Link from "next/link";
import { requireUser, accessibleCompanies } from "@/lib/auth";
import { recentActivity } from "@/lib/db";
import { ActivityFeed } from "@/components/ActivityFeed";

export const dynamic = "force-dynamic";

export default async function Changes({ searchParams }: PageProps<"/activity">) {
  const user = await requireUser();
  const sp = (await searchParams) as { mine?: string; company?: string };
  const companies = accessibleCompanies(user);
  const items = recentActivity(150, { companyIds: user.customerIds, actorId: sp.mine ? user.id : undefined, companyId: sp.company || undefined });
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { mine: sp.mine, company: sp.company, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const qs = p.toString();
    return `/activity${qs ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) => `rounded-[4px] border px-3 py-1 text-[12.5px] font-medium ${active ? "border-sd-primary bg-sd-primary-soft text-sd-dark" : "border-sd-border bg-white text-sd-muted hover:text-sd-text"}`;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-[24px] font-semibold">Changes</h1>
        <p className="mt-1 text-[14px] text-sd-muted">Everything that changed on the {companies.length} customers you are assigned to, newest first. Every line has a name.</p>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={link({ mine: undefined })} className={chip(!sp.mine)}>Everyone</Link>
        <Link href={link({ mine: "1" })} className={chip(!!sp.mine)}>Only my changes</Link>
        <span className="mx-1 h-5 w-px bg-sd-border" />
        <Link href={link({ company: undefined })} className={chip(!sp.company)}>All customers</Link>
        {companies.map((c) => <Link key={c.id} href={link({ company: c.id })} className={chip(sp.company === c.id)}>{c.name}</Link>)}
      </div>
      <div className="card px-5 py-1">
        <ActivityFeed items={items} />
      </div>
    </div>
  );
}
