import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { AccessDeniedError } from "@/lib/access";
import { handoverBrief, holdingsLabel, type BriefPoint, type HandoverBrief } from "@/lib/handover";
import { now } from "@/lib/clock";
import { fmtDate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

/** Handover brief for the new owner of a customer: every point with its source. */
export default async function HandoverBriefPage({ params }: PageProps<"/customers/[id]/handover/[handoverId]">) {
  const user = await requireUser();
  const { id, handoverId } = await params;
  let brief: HandoverBrief;
  try {
    brief = handoverBrief(user, handoverId, await now());
  } catch (e) {
    if (e instanceof AccessDeniedError) notFound();
    throw e;
  }
  const h = brief.handover;
  if (h.companyId !== id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <header>
        <div className="flex items-center gap-1 text-[12px] text-sd-muted">
          <Link href="/customers" className="hover:text-sd-primary">Customers</Link><ChevronRight className="h-3 w-3" />
          <Link href={`/customers/${id}`} className="hover:text-sd-primary">{brief.companyName}</Link><ChevronRight className="h-3 w-3" />
          <span>Handover brief</span>
        </div>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight">🍂 Handover brief: {brief.companyName}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13.5px] text-sd-muted">
          <Avatar id={h.toId} size="xs" /> <b className="text-sd-text">{brief.toName}</b> takes over {holdingsLabel(h)} from <Avatar id={h.fromId} size="xs" /> <b className="text-sd-text">{brief.fromName}</b> · {fmtDate(h.at)}
        </p>
      </header>
      <Section title="Key current facts" empty="No current facts were handed over." points={brief.facts} />
      <Section title="Open conflicts" empty="No open conflicts." points={brief.conflicts} />
      <Section title="Attention points" empty="No attention points." points={brief.attention} />
      <Section title="People to call" empty="No contacts found." points={brief.people} />
    </div>
  );
}

function Section({ title, points, empty }: { title: string; points: BriefPoint[]; empty: string }) {
  return (
    <section className="card p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sd-muted">{title} ({points.length})</h2>
      {points.length ? (
        <ul className="mt-3 space-y-3">
          {points.map((p, i) => (
            <li key={i} className="text-[13.5px]">
              <div className="font-medium leading-snug">{p.text}</div>
              {p.source.quote && <blockquote className="mt-1 border-l-2 border-emerald-300 pl-2 text-[12px] italic">“{p.source.quote}”</blockquote>}
              <Link href={p.source.href} className="mt-0.5 inline-block text-[11.5px] text-sd-muted hover:text-sd-primary">Source: {p.source.label}</Link>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-[13px] text-sd-muted">{empty}</p>}
    </section>
  );
}
