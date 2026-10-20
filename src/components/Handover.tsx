"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { handOverKnowledge, markRoleChanged } from "@/lib/handover-actions";

/** "Changed role?" on the knowledge-risk chip: marks the person as having left, which starts the herfst flow. */
export function RoleChangeButton({ personId, firstName, companyId }: { personId: string; firstName: string; companyId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => markRoleChanged(personId, companyId))}
      className="btn-secondary px-2 py-1 text-[11.5px] disabled:opacity-50"
      title={`Mark ${firstName} as having left or changed role`}
    >
      {pending ? "Marking…" : `${firstName} changed role?`}
    </button>
  );
}

export type SuccessorOption = { personId: string; name: string; contributions: number };

/** Herfst banner: "34 leaves come only from Jonas. Who takes over?" with the suggested successor preselected. */
export function HandoverBanner({ companyId, fromId, fromName, what, branch, options }: { companyId: string; fromId: string; fromName: string; what: string; branch: string; options: SuccessorOption[] }) {
  const [to, setTo] = useState(options[0]?.personId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const first = fromName.split(" ")[0];
  return (
    <div className="fade-up flex flex-wrap items-center gap-3 rounded-[8px] border border-amber-300 bg-amber-50 px-4 py-3 text-[13.5px]">
      <span className="text-[18px]">🍂</span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{what} come only from {first}. Who takes over?</div>
        {options[0] && <div className="text-[12px] text-sd-muted">Suggested: <b className="text-sd-text">{options[0].name.split(" ")[0]}</b>, {options[0].contributions} contribution{options[0].contributions === 1 ? "" : "s"} to {branch}. Only people assigned to this customer can be chosen.</div>}
        {error && <div className="text-[12px] text-rose-700">{error}</div>}
      </div>
      {options.length ? (
        <>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="input px-2 py-1.5 text-[13px]" aria-label="Successor">
            {options.map((o, i) => <option key={o.personId} value={o.personId}>{o.name} ({o.contributions}){i === 0 ? " · suggested" : ""}</option>)}
          </select>
          <button
            disabled={pending || !to}
            className="btn-primary px-3 py-1.5 text-[13px] disabled:opacity-50"
            onClick={() => start(async () => {
              try {
                const { handoverId } = await handOverKnowledge({ companyId, fromId, toId: to });
                router.push(`/customers/${companyId}/handover/${handoverId}`);
              } catch {
                setError("That person can't take over this customer.");
              }
            })}
          >
            {pending ? "Handing over…" : "Hand over"}
          </button>
        </>
      ) : <span className="text-[12px] text-sd-muted">Nobody else is assigned to this customer.</span>}
    </div>
  );
}
