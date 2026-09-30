import Link from "next/link";
import { FilePlus2, ShieldCheck, Archive, Upload, GitBranchPlus, MessageSquare, Mail, Pencil } from "lucide-react";
import type { Activity } from "@/lib/types";
import { Avatar, personName } from "./Avatar";
import { timeAgo } from "@/lib/format";

const icons = {
  created: FilePlus2, updated: Pencil, verified: ShieldCheck, superseded: Archive, new_version: Upload, node_added: GitBranchPlus, captured_teams: MessageSquare, captured_outlook: Mail,
};
const colors = {
  created: "bg-sd-navy/10 text-sd-navy", updated: "bg-slate-100 text-slate-600", verified: "bg-emerald-100 text-emerald-700", superseded: "bg-rose-100 text-rose-700", new_version: "bg-sky-100 text-sky-700", node_added: "bg-violet-100 text-violet-700", captured_teams: "bg-indigo-100 text-indigo-700", captured_outlook: "bg-blue-100 text-blue-700",
};

export type FeedItem = Activity & { companyName?: string; nodeName?: string };

export function ActivityFeed({ items, showCompany = true }: { items: FeedItem[]; showCompany?: boolean }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((a) => {
        const Icon = icons[a.action];
        return (
          <li key={a.id} className="flex items-start gap-3 py-2.5">
            <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${colors[a.action]}`}><Icon className="h-3.5 w-3.5" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] leading-snug text-slate-700">
                <span className="font-medium text-slate-900">{personName(a.actorId)}</span> {a.summary}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate-400">
                {showCompany && a.companyName && <Link href={`/customers/${a.companyId}?node=${a.nodeId}`} className="hover:text-sd-primary">{a.companyName}</Link>}
                {showCompany && a.nodeName && <span>›</span>}
                {a.nodeName && <Link href={`/customers/${a.companyId}?node=${a.nodeId}`} className="hover:text-sd-primary">{a.nodeName}</Link>}
                <span>·</span>
                <span>{timeAgo(a.at)}</span>
              </div>
            </div>
            <Avatar id={a.actorId} size="xs" className="mt-1" />
          </li>
        );
      })}
      {!items.length && <li className="py-6 text-center text-[13px] text-slate-400">No activity yet</li>}
    </ul>
  );
}
