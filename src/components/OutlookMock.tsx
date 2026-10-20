"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Mail, Inbox, Send, FileText, Archive, Trash2, Search, Reply, Forward, MoreHorizontal, Paperclip, ChevronRight, Check, ExternalLink, StickyNote, Star } from "lucide-react";
import { suggestNode, nodeSummary, addFile } from "@/lib/actions";
import { ingestText, type IngestedLeaf } from "@/lib/leaf-actions";
import { DEMO_MAILS, mailIngestInput, type DemoMail } from "@/lib/demo-mails";
import { LeafTypeBadge } from "./LeafList";

const mails = DEMO_MAILS;

export function OutlookMock() {
  const [sel, setSel] = useState(mails[0]);

  return (
    <div className="flex h-screen bg-[#f3f2f1] text-[#242424]">
      <div className="flex w-[52px] flex-col items-center gap-3 border-r border-[#e1dfdd] bg-white pt-4 text-[#605e5c]">
        <Mail className="h-5 w-5 text-[#0f6cbd]" /><Send className="h-5 w-5 opacity-40" /><FileText className="h-5 w-5 opacity-40" />
        <span className="mt-auto mb-4 grid h-8 w-8 place-items-center rounded-full bg-violet-500 text-[11px] font-semibold text-white">LV</span>
      </div>
      <div className="flex w-[170px] flex-col border-r border-[#e1dfdd] bg-[#faf9f8] pt-3">
        <div className="px-4 pb-2 text-[12px] font-semibold text-[#605e5c]">lena.vermeulen@sdworx.com</div>
        {[["Inbox", Inbox, mails.length], ["Sent", Send, 0], ["Drafts", FileText, 1], ["Archive", Archive, 0], ["Deleted", Trash2, 0]].map(([l, I, n], i) => { const Icon = I as typeof Inbox; return (
          <div key={l as string} className={`mx-2 flex items-center gap-2 rounded px-2 py-1.5 text-[13px] ${i === 0 ? "bg-[#edebe9] font-semibold" : ""}`}><Icon className="h-4 w-4 text-[#605e5c]" />{l as string}{(n as number) > 0 && <span className="ml-auto text-[11px] text-[#0f6cbd]">{n as number}</span>}</div>); })}
      </div>
      <div className="flex w-[290px] flex-col border-r border-[#e1dfdd] bg-white">
        <div className="flex items-center gap-2 border-b border-[#e1dfdd] px-3 py-2"><div className="flex flex-1 items-center gap-2 rounded bg-[#f3f2f1] px-2 py-1.5 text-[12px] text-[#605e5c]"><Search className="h-3.5 w-3.5" /> Search</div></div>
        <div className="px-3 py-2 text-[12px] font-semibold">Focused</div>
        {mails.map((m) => (
          <button key={m.id} onClick={() => setSel(m)} className={`border-l-[3px] px-3 py-2.5 text-left ${sel.id === m.id ? "border-[#0f6cbd] bg-[#edebe9]" : "border-transparent hover:bg-[#f3f2f1]"}`}>
            <div className="flex justify-between text-[12.5px]"><span className={m.unread ? "font-bold" : "font-medium"}>{m.from}</span><span className="text-[11px] text-[#605e5c]">{m.time}</span></div>
            <div className={`truncate text-[12.5px] ${m.unread ? "font-semibold text-[#0f6cbd]" : ""}`}>{m.subject}</div>
            <div className="truncate text-[11.5px] text-[#605e5c]">{m.preview}</div>
            {m.attachment && <Paperclip className="mt-0.5 h-3 w-3 text-[#605e5c]" />}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap border-b border-[#e1dfdd] px-4 py-2 text-[12.5px] text-[#242424]">
          {[["Reply", Reply], ["Forward", Forward]].map(([l, I]) => { const Icon = I as typeof Reply; return <span key={l as string} className="inline-flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[#f3f2f1]"><Icon className="h-4 w-4 text-[#0f6cbd]" />{l as string}</span>; })}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded bg-sd-subtle px-2 py-1 font-medium text-sd-text ring-1 ring-sd-border"><span className="text-[10px] font-bold">SD</span> KnowledgeTree</span><MoreHorizontal className="h-4 w-4" />
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-5">
          <h1 className="text-[20px] font-semibold">{sel.subject}</h1>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0f6cbd] text-[13px] font-semibold text-white">{sel.from.split(" ").map((x) => x[0]).join("")}</span>
            <div className="flex-1"><div className="text-[14px] font-semibold">{sel.from} <span className="font-normal text-[#605e5c]">&lt;{sel.email}&gt;</span></div><div className="text-[12px] text-[#605e5c]">To: Lena Vermeulen · Cc: Sofie De Smet, Jonas Becker</div></div>
            <span className="text-[12px] text-[#605e5c]">Tue 30/09/2026 {sel.time === "08:41" ? sel.time : ""}</span><Star className="h-4 w-4 text-[#605e5c]" />
          </div>
          {sel.attachment && <div className="mt-4 inline-flex items-center gap-2 rounded border border-[#e1dfdd] px-3 py-2 text-[12.5px]"><span className="grid h-7 w-7 place-items-center rounded bg-emerald-600 text-[10px] font-bold text-white">X</span><span><div className="font-medium">{sel.attachment.name}</div><div className="text-[11px] text-[#605e5c]">{sel.attachment.size}</div></span></div>}
          <pre className="mt-5 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-[#242424]">{sel.body}</pre>
        </div>
      </div>
      <AddInPane key={sel.id} sel={sel} />
    </div>
  );
}

function AddInPane({ sel }: { sel: DemoMail }) {
  const [suggest, setSuggest] = useState<Awaited<ReturnType<typeof suggestNode>>>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof nodeSummary>> | null>(null);
  const [caught, setCaught] = useState<{ leaves: IngestedLeaf[]; companyId: string | null } | "error" | null>(null);
  const [filed, setFiled] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    suggestNode(`${sel.from} ${sel.email} ${sel.subject} ${sel.body}`).then(async (s) => { setSuggest(s); if (s) setSummary(await nodeSummary(s.nodeId)); });
    // 0 clicks: every opened mail goes through ingest. Re-opening it returns the same leaves.
    ingestText(mailIngestInput(sel)).then(setCaught, () => setCaught("error"));
  }, [sel]);

  return (
    <>
      {/* Add-in pane */}
      <div className="flex w-[320px] flex-col border-l border-[#e1dfdd] bg-[#faf9f8]">
        <div className="flex items-center gap-2 border-b border-[#e1dfdd] bg-white px-4 py-3"><span className="grid h-7 w-7 place-items-center rounded-md bg-sd-dark text-white"><span className="text-[10px] font-bold">SD</span></span><span className="text-[14px] font-semibold">KnowledgeTree</span><span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">ADD-IN</span></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Detected in this email</div>
            {suggest ? (
              <div className="fade-up mt-1.5 rounded-lg border border-sd-border bg-white p-3">
                <div className="flex flex-wrap items-center gap-1 text-[13px] font-semibold text-sd-text">{suggest.path.map((p, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{p}</span>)}</div>
                <div className="mt-1 text-[11.5px] text-slate-500">Sender + content · {Math.round(suggest.confidence * 100)}% match · {suggest.category} · filed as <b>received from customer</b></div>
              </div>
            ) : <div className="mt-1.5 text-[12.5px] text-slate-400">Reading email…</div>}
          </div>
          {summary && (
            <div className="fade-up">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">What the tree knows</div>
              <ul className="mt-1.5 space-y-1">
                {summary.items.slice(0, 4).map((i) => <li key={i.id} className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-[12px] ring-1 ring-slate-100">{i.kind === "note" ? <StickyNote className="h-3.5 w-3.5 text-amber-500" /> : <FileText className="h-3.5 w-3.5 text-slate-500" />}<span className="min-w-0 flex-1 truncate">{i.title}</span><span className="text-[10px] font-medium uppercase text-slate-400">{i.origin === "customer" ? "customer" : "SDWorx"}</span></li>)}
                {!summary.items.length && <li className="text-[12px] text-slate-400">Nothing captured on this node yet.</li>}
              </ul>
              {summary.experts.length > 0 && <div className="mt-1.5 text-[11.5px] text-slate-500">Experts: {summary.experts.join(", ")}</div>}
            </div>
          )}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Read automatically</div>
            {caught === null ? (
              <div className="mt-1.5 text-[12.5px] text-slate-400">Looking for leaves…</div>
            ) : caught === "error" ? (
              <div className="mt-1.5 text-[12.5px] text-slate-400">Could not read this email right now.</div>
            ) : caught.leaves.length === 0 ? (
              <div className="fade-up mt-1.5 rounded-lg border border-dashed border-sd-border bg-white px-3 py-2.5 text-[12px] text-slate-500">Nothing worth keeping in this email. No leaves.</div>
            ) : (
              <div className="fade-up mt-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-900">
                <div className="flex items-center gap-1.5 font-semibold">🍃 {caught.leaves.length} lea{caught.leaves.length === 1 ? "f" : "ves"} caught</div>
                <ul className="mt-2 space-y-2">
                  {caught.leaves.map((l) => (
                    <li key={l.id} className="rounded-md bg-white p-2 ring-1 ring-emerald-100">
                      <div className="flex items-center gap-1.5"><LeafTypeBadge type={l.type} />{l.status === "seed" && <span className="text-[10.5px] font-medium text-amber-700">🌱 seed: place unsure</span>}</div>
                      <div className="mt-1 text-[12px] leading-snug text-sd-text">{l.statement}</div>
                      <div className="mt-1 text-[11px] text-slate-500">{l.path.join(" › ")} · {Math.round(l.confidence * 100)}%</div>
                    </li>
                  ))}
                </ul>
                {caught.companyId && <Link href={`/customers/${caught.companyId}?node=${caught.leaves[0].nodeId}`} className="mt-2 inline-flex items-center gap-1 font-medium text-emerald-800 underline">Open in KnowledgeTree <ExternalLink className="h-3 w-3" /></Link>}
              </div>
            )}
          </div>
          {sel.attachment && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Attachment</div>
              <button disabled={!suggest || pending || filed} onClick={() => start(async () => {
                if (!suggest) return;
                await addFile({ nodeId: suggest.nodeId, title: sel.attachment!.name.replace(/_/g, " ").replace(/\.xlsx$/, ""), fileName: sel.attachment!.name, fileSize: sel.attachment!.size, fileUrl: `/files/${sel.attachment!.name}`, previewUrl: "/files/att-nike-de-calendar.pdf", content: `Attachment from email "${sel.subject}" sent by ${sel.from}. ${sel.body.split("\n").find((l) => /important/i.test(l)) ?? ""}`.trim(), topic: suggest.topic === "General" ? "Payroll calendar" : suggest.topic, category: suggest.category, origin: "customer", scope: suggest.country ? [suggest.country] : ["all"], source: { type: "outlook", ref: `Email from ${sel.email}` } });
                setFiled(true);
              })} className="mt-1.5 flex w-full items-center gap-2 rounded-lg bg-[#0f6cbd] px-3 py-2 text-left text-[12.5px] font-medium text-white hover:bg-[#115ea3] disabled:opacity-50">
                {filed ? <Check className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />} {filed ? "Attachment filed to node" : "File attachment to this node"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
