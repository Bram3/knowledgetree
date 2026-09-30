"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, MessageCircle, Users, Calendar, Phone, MoreHorizontal, Search, Send, Bookmark, Smile, ChevronRight, X, Check, ExternalLink, FileText, User, Clock } from "lucide-react";
import { suggestNode, addNote, askBot, type BotAnswer } from "@/lib/actions";
import { stripMarkdown } from "@/lib/text";

type Msg = { id: string; from: string; initials: string; color: string; at: string; text: string; bot?: BotAnswer; saved?: string; me?: boolean };

const initial: Msg[] = [
  { id: "m1", from: "Sofie De Smet", initials: "SD", color: "bg-[#f1002f]", at: "09:12", text: "Morning Lena! Handing Nike over to you as discussed. Most of it is in the tree already, the rest I will add this week." },
  { id: "m2", from: "Lena Vermeulen", initials: "LV", color: "bg-[#001c52]", at: "09:14", text: "Thanks Sofie! Katrin from Nike Germany just asked what the payroll cutoff is, she heard it changed?", me: true },
  { id: "m3", from: "Sofie De Smet", initials: "SD", color: "bg-[#f1002f]", at: "09:16", text: "Yes, FYI Nike Deutschland GmbH confirmed the payroll cutoff moves to the 18th from the October run (was the 15th). Pay date stays the 25th. Katrin will send the new calendar by mail. Jonas already knows." },
];

export function TeamsMock() {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [saving, setSaving] = useState<Msg | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [draft, setDraft] = useState("@KnowledgeTree what is the payroll cutoff for Nike Germany?");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const mine: Msg = { id: `m${Date.now()}`, from: "Lena Vermeulen", initials: "LV", color: "bg-[#001c52]", at: now(), text, me: true };
    setMsgs((m) => [...m, mine]);
    setDraft("");
    if (/@knowledgetree/i.test(text)) {
      start(async () => {
        const a = await askBot(text.replace(/@knowledgetree/i, ""));
        setMsgs((m) => [...m, { id: `b${Date.now()}`, from: "KnowledgeTree", initials: "KT", color: "bg-sd-primary", at: now(), text: "", bot: a }]);
      });
    }
  };

  return (
    <div className="flex h-screen bg-[#ebebeb] text-[#242424]">
      {/* Teams rail */}
      <div className="flex w-[68px] flex-col items-center gap-1 bg-[#ebebeb] pt-4 text-[#616161]">
        {[["Activity", Bell], ["Chat", MessageCircle], ["Teams", Users], ["Calendar", Calendar], ["Calls", Phone]].map(([l, I], i) => { const Icon = I as typeof Bell; return (
          <div key={l as string} className={`flex w-full flex-col items-center gap-0.5 py-2 text-[10px] ${i === 1 ? "border-l-[3px] border-[#5b5fc7] text-[#5b5fc7]" : ""}`}><Icon className="h-5 w-5" />{l as string}</div>); })}
        <div className="mt-2 flex w-full flex-col items-center gap-0.5 py-2 text-[10px] text-[#5b5fc7]"><span className="grid h-6 w-6 place-items-center rounded-md bg-sd-dark text-white"><span className="text-[9px] font-bold">SD</span></span>KTree</div>
        <div className="mt-auto mb-4 grid h-8 w-8 place-items-center rounded-full bg-[#001c52] text-[11px] font-semibold text-white">LV</div>
      </div>
      {/* Chat list */}
      <div className="flex w-[300px] flex-col border-r border-[#e0e0e0] bg-[#f5f5f5]">
        <div className="flex items-center justify-between px-4 py-3"><span className="text-[16px] font-bold">Chat</span><MoreHorizontal className="h-4 w-4" /></div>
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-[12px] text-[#616161] ring-1 ring-[#e0e0e0]"><Search className="h-3.5 w-3.5" /> Search</div>
        <div className="px-2 text-[11px] font-semibold text-[#616161]">Recent</div>
        {[["Sofie De Smet", "Yes, FYI Nike Deutschland GmbH confirmed…", "09:16", "bg-[#f1002f]", "SD", true], ["Nike EMEA › General", "Marta: MSA 2026 price schedule uploaded", "Yesterday", "bg-[#212223]", "NE", false], ["Jonas Becker", "Katrin mailed me the calendar too", "Yesterday", "bg-[#006dd8]", "JB", false], ["Payroll BE squad", "Tom: CLA indexation memo is out", "Mon", "bg-[#f28f29]", "PB", false]].map(([n, p, t, c, i, a]) => (
          <div key={n as string} className={`mx-2 my-0.5 flex items-center gap-2.5 rounded-md px-2 py-2 ${a ? "bg-white shadow-sm" : "hover:bg-[#ebebeb]"}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white ${c}`}>{i as string}</span>
            <div className="min-w-0 flex-1"><div className="flex justify-between text-[12.5px]"><span className={a ? "font-semibold" : ""}>{n as string}</span><span className="text-[10.5px] text-[#616161]">{t as string}</span></div><div className="truncate text-[11.5px] text-[#616161]">{p as string}</div></div>
          </div>
        ))}
      </div>
      {/* Conversation */}
      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex items-center gap-3 border-b border-[#e0e0e0] px-5 py-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-pink-500 text-[11px] font-semibold text-white">SD</span>
          <div className="flex-1"><div className="text-[14px] font-semibold">Sofie De Smet</div><div className="text-[11px] text-[#616161]">Senior Payroll Consultant · Available</div></div>
          <div className="flex items-center gap-2 text-[#616161]"><button className="rounded-md bg-[#5b5fc7] px-3 py-1 text-[12px] font-medium text-white">Call</button><MoreHorizontal className="h-4 w-4" /></div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="text-center text-[11px] text-[#616161]">Today</div>
          {msgs.map((m) => m.bot ? <BotCard key={m.id} msg={m} /> : (
            <div key={m.id} onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)} className={`flex gap-3 ${m.me ? "flex-row-reverse" : ""}`}>
              <span className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white ${m.color}`}>{m.initials}</span>
              <div className={`relative max-w-[70%] rounded-lg px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.me ? "bg-[#e8ebfa]" : "bg-[#f5f5f5]"}`}>
                <div className="mb-0.5 flex items-center gap-2 text-[11px] text-[#616161]"><span className="font-semibold text-[#242424]">{m.from}</span>{m.at}</div>
                {m.text}
                {m.saved && <Link href={m.saved} className="mt-2 flex items-center gap-1.5 rounded-md border border-sd-border bg-white px-2 py-1 text-[11.5px] font-medium text-sd-primary"><span className="text-[9px] font-bold">SD</span> Saved to KnowledgeTree <ExternalLink className="ml-auto h-3 w-3" /></Link>}
                {!m.me && !m.saved && hover === m.id && (
                  <div className="fade-up absolute right-2 top-1 flex items-center gap-0.5 rounded-md border border-[#e0e0e0] bg-white p-0.5 shadow-sm">
                    <button className="rounded p-1 hover:bg-[#f5f5f5]"><Smile className="h-3.5 w-3.5 text-[#616161]" /></button>
                    <button className="rounded p-1 hover:bg-[#f5f5f5]"><Bookmark className="h-3.5 w-3.5 text-[#616161]" /></button>
                    <button onClick={() => setSaving(m)} className="flex items-center gap-1 rounded bg-sd-subtle px-1.5 py-1 text-[11px] font-medium text-sd-primary hover:bg-sd-subtle"><span className="text-[9px] font-bold">SD</span> Save to KnowledgeTree</button>
                    <button className="rounded p-1 hover:bg-[#f5f5f5]"><MoreHorizontal className="h-3.5 w-3.5 text-[#616161]" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {pending && <div className="flex items-center gap-2 text-[12px] text-[#616161]"><span className="grid h-6 w-6 place-items-center rounded-full bg-sd-dark text-white"><span className="text-[8px] font-bold">SD</span></span> KnowledgeTree is looking through the tree…</div>}
          <div ref={endRef} />
        </div>
        <div className="px-6 pb-5">
          <div className="flex items-center gap-2 rounded-lg border border-[#e0e0e0] px-3 py-2 focus-within:border-[#5b5fc7]">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message. Mention @KnowledgeTree to ask the tree." className="flex-1 bg-transparent text-[13.5px] outline-none" />
            <button onClick={send} className="text-[#5b5fc7]"><Send className="h-4 w-4" /></button>
          </div>
          <div className="mt-1.5 text-[11px] text-[#616161]">Hover a message to see the <b>Save to KnowledgeTree</b> action · mention <b>@KnowledgeTree</b> to ask the tree</div>
        </div>
      </div>
      {saving && <SaveDialog msg={saving} onClose={() => setSaving(null)} onSaved={(href) => { setMsgs((ms) => ms.map((x) => (x.id === saving.id ? { ...x, saved: href } : x))); setSaving(null); }} />}
    </div>
  );
}

function now() { return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }

function SaveDialog({ msg, onClose, onSaved }: { msg: Msg; onClose: () => void; onSaved: (href: string) => void }) {
  const [suggest, setSuggest] = useState<Awaited<ReturnType<typeof suggestNode>>>(null);
  const [title, setTitle] = useState(msg.text.length > 60 ? msg.text.slice(0, 57) + "…" : msg.text);
  const [pending, start] = useTransition();
  useEffect(() => { suggestNode(msg.text).then(setSuggest); }, [msg.text]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up w-[520px] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3"><span className="grid h-7 w-7 place-items-center rounded-md bg-sd-dark text-white"><span className="text-[10px] font-bold">SD</span></span><span className="text-[14px] font-semibold">Save to KnowledgeTree</span><button onClick={onClose} className="ml-auto text-slate-400"><X className="h-4 w-4" /></button></div>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg bg-slate-50 p-3 text-[12.5px] leading-relaxed text-slate-600"><span className="font-semibold text-slate-800">{msg.from}</span> · {msg.at}<br />{msg.text}</div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Suggested node</div>
            {suggest ? (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-sd-border bg-sd-subtle px-3 py-2">
                <div className="flex flex-wrap items-center gap-1 text-[13px] font-medium text-sd-text">{suggest.path.map((p, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{p}</span>)}</div>
                <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-sd-primary">{Math.round(suggest.confidence * 100)}% match</span>
              </div>
            ) : <div className="mt-1.5 text-[12.5px] text-slate-400">Detecting customer and entity…</div>}
            {suggest && <div className="mt-1.5 flex gap-1.5 text-[11.5px] text-slate-500"><span>Category: <b>{suggest.category}</b></span>·<span>Topic: <b>{suggest.topic}</b></span>·<span>Scope: <b>{suggest.country ?? "All countries"}</b></span>·<span>Origin: <b>SDWorx (internal chat)</b></span></div>}
          </div>
          {suggest && suggest.related.length > 0 && <div className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">Already on this node about {suggest.topic.toLowerCase()}: <b>{suggest.related[0].title}</b>. This message is added as a new item with a link back to the chat.</div>}
          <label className="block text-[12px] font-medium text-slate-600">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-sd-navy" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-[13px] text-slate-600">Cancel</button>
          <button disabled={!suggest || pending} onClick={() => start(async () => {
            if (!suggest) return;
            await addNote({ nodeId: suggest.nodeId, title, content: msg.text, topic: suggest.topic, category: suggest.category, origin: "sdworx", scope: suggest.country ? [suggest.country] : ["all"], source: { type: "teams", ref: `Chat with ${msg.from}, ${msg.at}` } });
            onSaved(`/customers/${suggest.companyId}?node=${suggest.nodeId}`);
          })} className="inline-flex items-center gap-1.5 rounded-md bg-[#5b5fc7] px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"><Check className="h-4 w-4" /> {pending ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function BotCard({ msg }: { msg: Msg }) {
  const a = msg.bot!;
  return (
    <div className="fade-up flex gap-3">
      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sd-dark text-white"><span className="text-[10px] font-bold">SD</span></span>
      <div className="w-[440px] overflow-hidden rounded-lg border border-[#e0e0e0]">
        <div className="flex items-center gap-2 bg-[#f5f5f5] px-3.5 py-2 text-[11px] text-[#616161]"><span className="font-semibold text-[#242424]">KnowledgeTree</span><span className="rounded bg-sd-subtle px-1 text-[9.5px] font-bold uppercase text-sd-primary">bot</span>{msg.at}</div>
        {a.found ? (
          <div className="p-3.5">
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400">{a.path?.map((p, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{p}</span>)}</div>
            <div className="mt-1 text-[14px] font-semibold">{a.title}</div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{stripMarkdown(a.answer ?? "")}</p>
            <ul className="mt-3 space-y-1 text-[11.5px] text-slate-600">
              <li className="flex items-center gap-1.5"><User className="h-3 w-3 text-slate-400" /> Owner: {a.owner}</li>
              <li className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-slate-400" /> Version {a.version}, last changed by {a.updated}</li>
              {a.source && <li className="flex items-center gap-1.5"><FileText className="h-3 w-3 text-slate-400" /> Source: {a.source}</li>}
            </ul>
            {a.alternatives && a.alternatives.length > 0 && <div className="mt-3 rounded-md bg-slate-50 px-2.5 py-2 text-[11.5px] text-slate-500"><FileText className="mr-1 inline h-3 w-3" /> Also on this topic: {a.alternatives.map((x) => `${x.title}${x.status === "superseded" ? " (superseded)" : ""}`).join("; ")}</div>}
            <div className="mt-3 flex items-center gap-2">
              <Link href={`/customers/${a.companyId}?node=${a.nodeId}&cat=${a.category}&item=${a.itemId}`} className="rounded-md bg-[#5b5fc7] px-3 py-1.5 text-[12px] font-medium text-white">Open in KnowledgeTree</Link>
              {a.expert && <button className="rounded-md border border-[#e0e0e0] px-3 py-1.5 text-[12px] font-medium text-[#242424]">Ask {a.expert.split(" ")[0]}</button>}
            </div>
          </div>
        ) : (
          <div className="p-3.5 text-[13px] text-slate-700">I could not find this in the tree{a.path ? ` for ${a.path.join(" › ")}` : ""}, or you have no access to that customer. {a.expert ? <>The expert for this node is <b>{a.expert}</b>.</> : ""}<div className="mt-3 flex gap-2">{a.expert && <button className="rounded-md bg-[#5b5fc7] px-3 py-1.5 text-[12px] font-medium text-white">Ask {a.expert.split(" ")[0]} in Teams</button>}{a.nodeId && <Link href={`/customers/${a.companyId}?node=${a.nodeId}`} className="rounded-md border border-[#e0e0e0] px-3 py-1.5 text-[12px] font-medium">Open node</Link>}</div></div>
        )}
      </div>
    </div>
  );
}
