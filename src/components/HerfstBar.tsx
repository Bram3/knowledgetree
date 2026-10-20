import Link from "next/link";
import { FileText } from "lucide-react";
import { company, getDb, person } from "@/lib/db";
import { customerRisk, holdingsLabel, orphanedKnowledge, successorCandidates } from "@/lib/handover";
import { Avatar } from "./Avatar";
import { HandoverBanner, RoleChangeButton } from "./Handover";

/**
 * Herfst on the customer card (scene 5): the knowledge risk ("62% of what we know about Germany comes from Jonas"),
 * a banner per person who left with knowledge nobody else owns, and a link to the latest handover brief.
 * Server component: call it only after the customer access check.
 */
export function HerfstBar({ companyId, now }: { companyId: string; now: Date }) {
  const c = company(companyId);
  if (!c) return null;
  const risk = customerRisk(companyId, now);
  const riskPerson = risk ? person(risk.personId) : null;
  const orphans = orphanedKnowledge(companyId);
  const latest = getDb().handovers.filter((h) => h.companyId === companyId).sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!risk && !orphans.length && !latest) return null;
  const branch = (personId: string) => (risk && risk.personId === personId ? risk.nodeName : c.name);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
        {risk && riskPerson && (
          <span className={`inline-flex items-center gap-2 rounded-[8px] border px-3 py-1.5 ${risk.percent >= 50 ? "border-amber-300 bg-amber-50" : "border-sd-border bg-white"}`} title={`${risk.count} of ${risk.total} current leaves and notes`}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sd-muted">Knowledge risk</span>
            <b className="text-[14px] text-amber-800">{risk.percent}%</b>
            <span>of what we know about {risk.nodeName} comes from</span>
            <span className="inline-flex items-center gap-1 font-medium"><Avatar id={riskPerson.id} size="xs" /> {riskPerson.name.split(" ")[0]}</span>
            {riskPerson.leftAt ? <span className="text-sd-muted">(changed role)</span> : <RoleChangeButton personId={riskPerson.id} firstName={riskPerson.name.split(" ")[0]} companyId={companyId} />}
          </span>
        )}
        {latest && (
          <Link href={`/customers/${companyId}/handover/${latest.id}`} className="inline-flex items-center gap-1.5 text-sd-primary hover:underline">
            <FileText className="h-3.5 w-3.5" /> Handover brief for {person(latest.toId)?.name.split(" ")[0]}
          </Link>
        )}
      </div>
      {orphans.map((o) => {
        const from = person(o.personId)!;
        const options = successorCandidates(o.personId, companyId).map((x) => ({ personId: x.personId, name: person(x.personId)?.name ?? x.personId, contributions: x.contributions }));
        return <HandoverBanner key={o.personId} companyId={companyId} fromId={o.personId} fromName={from.name} what={holdingsLabel(o)} branch={branch(o.personId)} options={options} />;
      })}
    </div>
  );
}
