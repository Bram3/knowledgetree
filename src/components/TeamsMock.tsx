"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, MessageCircle, Users, Calendar, Phone, MoreHorizontal, Search, Send, Bookmark, Smile, ChevronRight, ExternalLink, FileText, User, Clock } from "lucide-react";
import { askBot, type BotAnswer } from "@/lib/actions";
import { ingestText, type Ingested } from "@/lib/leaf-actions";
import { DEMO_TEAMS_MESSAGES, teamsReactionInput } from "@/lib/demo-teams";
import { stripMarkdown } from "@/lib/text";
import { ConflictCards } from "./ConflictCards";
import { leafIcon, leavesLabel } from "./LeafBadges";

/**
 * What a 🍃 reaction on a message grew: still thinking, leaves (or known leaves/notes) on a node, nothing worth keeping,
 * or a failure. "kept" comes from the stored leaves on load; the others only live in this page.
 */
type Reaction = { state: "pending" } | { state: "kept"; caught: Ingested & { companyId: string } } | { state: "nothing" } | { state: "failed" };
type Msg = { id: string; from: string; initials: string; color: string; at: string; text: string; bot?: BotAnswer; me?: boolean; leaf?: Reaction };

const kept = (caught: Ingested): Reaction | null =>
  caught.companyId && (caught.leaves.length || caught.reconfirmed.length || caught.reconfirmedNotes.length) ? { state: "kept", caught: { ...caught, companyId: caught.companyId } } : null;

/** `reactions`: the stored 🍃 reactions per message id (from `teamsReactions()`). */
export function TeamsMock({ reactions }: { reactions: Record<string, Ingested> }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => DEMO_TEAMS_MESSAGES.map((m) => ({ ...m, leaf: reactions[m.id] ? kept(reactions[m.id]) ?? undefined : undefined })));
  const [hover, setHover] = useState<string | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  const [draft, setDraft] = useState("@KnowledgeTree what is the payroll cutoff for Nike Germany?");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // A leaf links back here as /teams#<message id>: show that message instead of the end of the chat.
    const id = decodeURIComponent(window.location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (!el) {
      endRef.current?.scrollIntoView();
      return;
    }
    el.scrollIntoView({ block: "center" });
    setLinked(id); // eslint-disable-line react-hooks/set-state-in-effect -- reads the URL hash once after mount
  }, []);
  const seen = useRef(msgs.length);
  useEffect(() => {
    if (msgs.length === seen.current) return;
    seen.current = msgs.length;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const setReaction = (id: string, leaf: Reaction) => setMsgs((ms) => ms.map((x) => (x.id === id ? { ...x, leaf } : x)));
  /** 🍃 = "this matters": the message goes through the ingest entry point with trigger "reaction". */
  const react = (m: Msg) => {
    if (m.leaf && m.leaf.state !== "failed") return;
    setReaction(m.id, { state: "pending" });
    ingestText(teamsReactionInput(m))
      .then((r) => setReaction(m.id, kept(r) ?? { state: "nothing" })) // a reconfirmation makes no new leaf, it strengthens a known one (×n)
      .catch(() => setReaction(m.id, { state: "failed" }));
  };

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
            <div key={m.id} id={m.id} onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)} className={`flex gap-3 ${m.me ? "flex-row-reverse" : ""}`}>
              <span className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white ${m.color}`}>{m.initials}</span>
              <div className={`relative max-w-[70%] rounded-lg px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.me ? "bg-[#e8ebfa]" : "bg-[#f5f5f5]"} ${linked === m.id ? "ring-2 ring-emerald-300" : ""}`}>
                <div className="mb-0.5 flex items-center gap-2 text-[11px] text-[#616161]"><span className="font-semibold text-[#242424]">{m.from}</span>{m.at}</div>
                {m.text}
                {m.leaf && <LeafReaction r={m.leaf} />}
                {!m.me && !m.leaf && hover === m.id && (
                  <div className="fade-up absolute right-2 top-1 flex items-center gap-0.5 rounded-md border border-[#e0e0e0] bg-white p-0.5 shadow-sm">
                    <button onClick={() => react(m)} title="React with 🍃 to keep this in KnowledgeTree" aria-label="React with a leaf" className="rounded px-1 py-0.5 text-[14px] leading-none hover:bg-emerald-50">🍃</button>
                    <button className="rounded p-1 hover:bg-[#f5f5f5]"><Smile className="h-3.5 w-3.5 text-[#616161]" /></button>
                    <button className="rounded p-1 hover:bg-[#f5f5f5]"><Bookmark className="h-3.5 w-3.5 text-[#616161]" /></button>
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
          <div className="mt-1.5 text-[11px] text-[#616161]">React <b>🍃</b> to a message to keep it in the tree · mention <b>@KnowledgeTree</b> to ask the tree</div>
        </div>
      </div>
      <ConflictCards />
    </div>
  );
}

/** The 🍃 under a message, plus where its leaves grew (or a short hint when there was nothing to keep). */
function LeafReaction({ r }: { r: Reaction }) {
  const pill = <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">🍃 1</span>;
  if (r.state === "pending") return <div className="mt-2 flex items-center gap-2 text-[11.5px] text-[#616161]">{pill} Reading the message…</div>;
  if (r.state === "nothing") return <div className="mt-2 flex items-center gap-2 text-[11.5px] text-[#616161]">{pill} Nothing to keep in this message.</div>;
  if (r.state === "failed") return <div className="mt-2 flex items-center gap-2 text-[11.5px] text-rose-700">{pill} Could not reach KnowledgeTree. React again to retry.</div>;
  const { leaves: fresh, reconfirmed, reconfirmedNotes, companyId } = r.caught;
  const leaves = [...fresh, ...reconfirmed];
  const [first] = leaves;
  const seed = leafIcon(leaves) === "🌱";
  return (
    <div className="mt-2 space-y-1.5">
      {pill}
      {first && (
        <Link href={`/customers/${companyId}?node=${first.nodeId}`} className="fade-up flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11.5px] font-medium text-emerald-800">
          <span>{leafIcon(leaves)} {!fresh.length ? `known leaf ×${first.reconfirmedAt.length + 1}` : `${leavesLabel(fresh.length)}${reconfirmed.length ? `, ${reconfirmed.length} reconfirmed` : ""}`} {seed ? "waiting at" : "on"}</span>
          <span className="flex flex-wrap items-center gap-1 text-sd-text">{first.path.map((p, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{p}</span>)}</span>
          <ExternalLink className="ml-auto h-3 w-3" />
        </Link>
      )}
      {reconfirmedNotes.map((n) => (
        <Link key={n.id} href={`/customers/${companyId}?node=${n.nodeId}&item=${n.id}`} className="fade-up flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11.5px] font-medium text-emerald-800">
          <span>Confirms the note “{n.title}” ×{n.times}</span>
          <ExternalLink className="ml-auto h-3 w-3" />
        </Link>
      ))}
    </div>
  );
}

function now() { return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }

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
