"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Mail, Inbox, Send, FileText, Archive, Trash2, Search, Reply, Forward, MoreHorizontal, Paperclip, ChevronRight, Check, ExternalLink, StickyNote, Star } from "lucide-react";
import { suggestNode, nodeSummary, addFile, addNote } from "@/lib/actions";

const mails = [
  { id: "e1", from: "Katrin Vogel", email: "katrin.vogel@nike.com", subject: "Updated payroll calendar Q4 2026 – Nike Deutschland GmbH", time: "08:41", preview: "Hi Lena, as discussed with Sofie, please find attached the new payroll calendar…", body: `Hi Lena,

As discussed with Sofie, please find attached the new payroll calendar for Nike Deutschland GmbH for Q4 2026.

Important: from the October run the cutoff for variable input moves from the 15th to the 18th of the month, because of our new time registration system. Pay date remains the 25th.

Could you confirm that SDWorx has this on file? We had some confusion last year with different versions floating around.

Mit freundlichen Grüßen,
Katrin Vogel
Head of Payroll Germany, Nike Deutschland GmbH`, attachment: { name: "Nike_DE_Payroll_Calendar_Q4_2026.xlsx", size: "128 KB" }, unread: true },
  { id: "e2", from: "Marta Kowalski", email: "marta.kowalski@sdworx.com", subject: "RE: Nike MSA 2026 price schedule", time: "Yesterday", preview: "Uploaded v3 to the tree, Tom verified the appendix.", body: "Uploaded v3 to the tree, Tom verified the appendix.\n\nMarta", unread: false },
  { id: "e3", from: "Anouk de Vries", email: "anouk.devries@nike.com", subject: "Nike Hilversum: question about 30% ruling end dates", time: "Mon", preview: "Hi, two of our expats' rulings end in December…", body: "Hi,\n\nTwo of our expats' rulings end in December. Can you check what we need to do?\n\nAnouk", unread: false },
  { id: "e4", from: "Joris Bakker", email: "j.bakker@valk.nl", subject: "Van der Valk Hotel Amsterdam: new roster export", time: "Mon", preview: "Hi Pieter, from next month the roster export…", body: "Hi Pieter,\n\nFrom next month the roster export from Hotel Amsterdam comes from the new planning tool. Specification attached next week.\n\nJoris", unread: false },
];

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
        {[["Inbox", Inbox, 4], ["Sent", Send, 0], ["Drafts", FileText, 1], ["Archive", Archive, 0], ["Deleted", Trash2, 0]].map(([l, I, n], i) => { const Icon = I as typeof Inbox; return (
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

function AddInPane({ sel }: { sel: (typeof mails)[number] }) {
  const [suggest, setSuggest] = useState<Awaited<ReturnType<typeof suggestNode>>>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof nodeSummary>>>(null);
  const [saved, setSaved] = useState<{ what: string; href: string }[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    suggestNode(`${sel.from} ${sel.email} ${sel.subject} ${sel.body}`).then(async (s) => { setSuggest(s); if (s) setSummary(await nodeSummary(s.nodeId)); });
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
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Capture</div>
            <div className="mt-1.5 space-y-1.5">
              {sel.attachment && (
                <button disabled={!suggest || pending || saved.some((s) => s.what === "file")} onClick={() => start(async () => {
                  if (!suggest) return;
                  await addFile({ nodeId: suggest.nodeId, title: sel.attachment!.name.replace(/_/g, " ").replace(/\.xlsx$/, ""), fileName: sel.attachment!.name, fileSize: sel.attachment!.size, fileUrl: `/files/${sel.attachment!.name}`, previewUrl: "/files/att-nike-de-calendar.pdf", content: `Attachment from email "${sel.subject}" sent by ${sel.from}. ${sel.body.split("\n").find((l) => /important/i.test(l)) ?? ""}`.trim(), topic: suggest.topic === "General" ? "Payroll calendar" : suggest.topic, category: suggest.category, origin: "customer", scope: suggest.country ? [suggest.country] : ["all"], source: { type: "outlook", ref: `Email from ${sel.email}` } });
                  setSaved((s) => [...s, { what: "file", href: `/customers/${suggest.companyId}?node=${suggest.nodeId}` }]);
                })} className="flex w-full items-center gap-2 rounded-lg bg-[#0f6cbd] px-3 py-2 text-left text-[12.5px] font-medium text-white hover:bg-[#115ea3] disabled:opacity-50">
                  {saved.some((s) => s.what === "file") ? <Check className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />} {saved.some((s) => s.what === "file") ? "Attachment filed to node" : "File attachment to this node"}
                </button>
              )}
              <button disabled={!suggest || pending || saved.some((s) => s.what === "note")} onClick={() => start(async () => {
                if (!suggest) return;
                await addNote({ nodeId: suggest.nodeId, title: sel.subject.replace(/^(RE|FW):\s*/i, ""), content: sel.body.split("\n").filter((l) => l.trim() && !/^(hi|dear|mit|regards|klaus|head of|els|anouk|marta)/i.test(l.trim())).join(" ").slice(0, 400), topic: suggest.topic, category: suggest.category, origin: "customer", scope: suggest.country ? [suggest.country] : ["all"], source: { type: "outlook", ref: `Email from ${sel.email}, ${sel.time}` } });
                setSaved((s) => [...s, { what: "note", href: `/customers/${suggest.companyId}?node=${suggest.nodeId}` }]);
              })} className="flex w-full items-center gap-2 rounded-lg border border-[#e1dfdd] bg-white px-3 py-2 text-left text-[12.5px] font-medium hover:bg-[#f3f2f1] disabled:opacity-50">
                {saved.some((s) => s.what === "note") ? <Check className="h-4 w-4 text-emerald-600" /> : <StickyNote className="h-4 w-4 text-amber-500" />} {saved.some((s) => s.what === "note") ? "Email saved as note" : "Save email as a note"}
              </button>
            </div>
            {saved.length > 0 && (
              <div className="fade-up mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-800">
                <div className="flex items-center gap-1.5 font-semibold"><Check className="h-4 w-4" /> Captured with full audit trail</div>
                <div className="mt-0.5 text-emerald-700">Saved by Lena Vermeulen, just now, source email kept.</div>
                <Link href={saved[0].href} className="mt-2 inline-flex items-center gap-1 font-medium text-emerald-800 underline">Open node in KnowledgeTree <ExternalLink className="h-3 w-3" /></Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
