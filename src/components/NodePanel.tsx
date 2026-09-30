"use client";

import { useState, useTransition } from "react";
import { ChevronRight, UserPlus, Upload, Plus, StickyNote, Paperclip, History, Users, BookOpen, ArrowDownToLine, Phone, MessageSquare, Pencil, Archive, Building2, ArrowDownLeft, Download } from "lucide-react";
import type { Item, OrgNode, Person } from "@/lib/types";
import type { Product } from "@/lib/catalog";
import { OTHER_CATEGORY } from "@/lib/catalog";
import { Avatar, personName } from "./Avatar";
import { KindIcon, ScopeTags, SourceBadge } from "./ui";
import { ActivityFeed, type FeedItem } from "./ActivityFeed";
import { Markdown } from "./Markdown";
import { stripMarkdown } from "@/lib/text";
import { ViewDocumentButton } from "./DocumentViewer";
import { NoteEditor } from "./NoteEditor";
import { fmtDate, timeAgo, COUNTRY_NAME } from "@/lib/format";
import { claimItem, addNote, uploadFile, uploadVersion, updateNote, archiveItem } from "@/lib/actions";

export type PanelItem = Item & { inheritedFrom?: string };
export type PanelData = {
  node: OrgNode;
  path: { id: string; name: string }[];
  viewCountry?: string;
  categories: Product[];
  items: Item[];
  inherited: PanelItem[];
  experts: Person[];
  activity: FeedItem[];
  highlightItem?: string;
  currentUserId: string;
  initialCategory?: string;
};

export function NodePanel({ data }: { data: PanelData }) {
  const highlightCat = data.items.find((i) => i.id === data.highlightItem)?.category;
  const [tab, setTab] = useState<"knowledge" | "people" | "history">("knowledge");
  const [cat, setCat] = useState<string>(data.initialCategory ?? (highlightCat && data.categories.some((c) => c.id === highlightCat) ? highlightCat : "all"));
  const [adding, setAdding] = useState<null | "note" | "file">(null);
  const active = data.items.filter((i) => i.status === "active");
  const superseded = data.items.filter((i) => i.status === "superseded");
  const cats = [...data.categories, ...(active.some((i) => !data.categories.some((c) => c.id === i.category)) ? [OTHER_CATEGORY] : [])];
  const visible = cat === "all" ? active : active.filter((i) => i.category === cat);
  const ours = visible.filter((i) => i.origin === "sdworx");
  const theirs = visible.filter((i) => i.origin === "customer");
  const visibleInherited = cat === "all" ? data.inherited : data.inherited.filter((i) => i.category === cat);
  const defaultCategory = cat === "all" ? data.categories[0]?.id : cat;

  return (
    <aside className="card flex min-h-0 flex-col overflow-hidden">
      <div className="border-b border-sd-border px-5 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-1 text-[11.5px] text-sd-muted">{data.path.map((p, i) => <span key={p.id} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{p.name}</span>)}</div>
        <div className="mt-1 flex items-center gap-2">
          <h2 className="text-[18px] font-semibold">{data.node.name}{cat !== "all" && <span className="text-sd-muted"> › {cats.find((c) => c.id === cat)?.name}</span>}</h2>
          <span className="rounded-[4px] bg-sd-subtle px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sd-muted">{data.node.type}{data.viewCountry ? ` · ${COUNTRY_NAME[data.viewCountry] ?? data.viewCountry}` : ""}</span>
        </div>
        <div className="mt-3 flex gap-1">
          {([["knowledge", "Knowledge", BookOpen, active.length + data.inherited.length], ["people", "People", Users, data.experts.length + (data.node.contacts?.length ?? 0)], ["history", "History", History, data.activity.length]] as const).map(([k, label, Icon, n]) => (
            <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12.5px] font-medium ${tab === k ? "bg-sd-dark text-white" : "text-sd-muted hover:bg-sd-subtle"}`}><Icon className="h-3.5 w-3.5" /> {label} <span className={`rounded-[4px] px-1 text-[10.5px] ${tab === k ? "bg-white/15" : "bg-sd-subtle"}`}>{n}</span></button>
          ))}
        </div>
      </div>

      {tab === "knowledge" && (
        <div className="flex gap-1 overflow-x-auto border-b border-sd-border px-5 py-2">
          <button onClick={() => setCat("all")} className={`shrink-0 rounded-[4px] px-2 py-1 text-[11.5px] font-medium ${cat === "all" ? "bg-sd-subtle text-sd-text" : "text-sd-muted hover:text-sd-text"}`}>All</button>
          {cats.map((p) => {
            const n = active.filter((i) => i.category === p.id).length;
            return (
              <button key={p.id} onClick={() => setCat(p.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-[4px] px-2 py-1 text-[11.5px] font-medium ${cat === p.id ? "text-sd-text" : "text-sd-muted hover:text-sd-text"}`} style={cat === p.id ? { background: `${p.color}1a`, color: p.color } : undefined}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />{p.name}<span className="opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tab === "knowledge" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-sd-muted">{cat === "all" ? "All categories" : cats.find((c) => c.id === cat)?.name} · {visible.length} item{visible.length === 1 ? "" : "s"}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setAdding("note")} className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-[12px]"><StickyNote className="h-3.5 w-3.5" /> Note</button>
                <button onClick={() => setAdding("file")} className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-[12px]"><Upload className="h-3.5 w-3.5" /> Upload</button>
              </div>
            </div>
            {adding === "note" && (
              <NoteEditor mode="new" categories={data.categories} defaultCategory={defaultCategory} country={data.viewCountry} onClose={() => setAdding(null)}
                onCreate={async (input) => { await addNote({ nodeId: data.node.id, ...input }); }} />
            )}
            {adding === "file" && <UploadForm nodeId={data.node.id} country={data.viewCountry} categories={data.categories} defaultCategory={defaultCategory} onDone={() => setAdding(null)} />}

            <Section icon={Building2} title="SDWorx documents" hint="Created and maintained by SDWorx" count={ours.length}>
              {ours.map((i) => <ItemCard key={i.id} item={i} highlight={data.highlightItem === i.id} me={data.currentUserId} categories={data.categories} />)}
            </Section>
            <Section icon={ArrowDownLeft} title="Received from customer" hint="Documents the customer gave us, kept as received" count={theirs.length} tone="customer">
              {theirs.map((i) => <ItemCard key={i.id} item={i} highlight={data.highlightItem === i.id} me={data.currentUserId} categories={data.categories} />)}
            </Section>

            {superseded.length > 0 && cat === "all" && (
              <details className="group">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.1em] text-sd-muted">Archived / superseded ({superseded.length})</summary>
                <div className="mt-2 space-y-2 opacity-70">{superseded.map((i) => <ItemCard key={i.id} item={i} highlight={false} me={data.currentUserId} categories={data.categories} />)}</div>
              </details>
            )}
            {visibleInherited.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-sd-muted"><ArrowDownToLine className="h-3.5 w-3.5" /> Inherited from parent entities ({visibleInherited.length})</summary>
                <div className="mt-2 space-y-2">{visibleInherited.map((i) => <ItemCard key={i.id} item={i} highlight={false} me={data.currentUserId} categories={data.categories} />)}</div>
              </details>
            )}
          </div>
        )}

        {tab === "people" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sd-muted">SDWorx experts for this entity</h3>
              <ul className="mt-3 space-y-2">
                {data.experts.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-[8px] border border-sd-border p-3">
                    <Avatar id={p.id} />
                    <div className="min-w-0 flex-1"><div className="text-[13.5px] font-medium">{p.name}</div><div className="text-[11.5px] text-sd-muted">{p.role}</div></div>
                    <button className="btn-secondary p-2" title="Chat in Teams"><MessageSquare className="h-4 w-4" /></button>
                    <button className="btn-secondary p-2" title="Call"><Phone className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
            {data.node.contacts && data.node.contacts.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sd-muted">Customer contacts</h3>
                <ul className="mt-3 space-y-2">
                  {data.node.contacts.map((ct) => (
                    <li key={ct.email} className="flex items-center gap-3 rounded-[8px] border border-sd-border p-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-sd-subtle text-[12px] font-semibold text-sd-dark">{ct.name.split(" ").map((x) => x[0]).join("")}</span>
                      <div className="min-w-0 flex-1"><div className="text-[13.5px] font-medium">{ct.name}</div><div className="text-[11.5px] text-sd-muted">{ct.role} · {ct.email}</div></div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div>
            <p className="mb-2 text-[12px] text-sd-muted">Everything that changed on this entity, by everyone, newest first.</p>
            <ActivityFeed items={data.activity} showCompany={false} />
          </div>
        )}
      </div>
    </aside>
  );
}

function Section({ icon: Icon, title, hint, count, tone, children }: { icon: typeof Building2; title: string; hint: string; count: number; tone?: "customer"; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-[4px] ${tone === "customer" ? "bg-sd-gold/15 text-amber-700" : "bg-sd-dark/10 text-sd-dark"}`}><Icon className="h-3.5 w-3.5" /></span>
        <span className="text-[12.5px] font-semibold">{title}</span>
        <span className="text-[11.5px] text-sd-muted">· {count}</span>
        <span className="ml-auto text-[11px] text-slate-400">{hint}</span>
      </div>
      {count === 0 ? <div className="rounded-[4px] border border-dashed border-sd-border px-3 py-3 text-center text-[12px] text-slate-400">Nothing here yet</div> : <div className="space-y-2">{children}</div>}
    </section>
  );
}

function ItemCard({ item, highlight, me, categories }: { item: PanelItem; highlight: boolean; me: string; categories: Product[] }) {
  const [open, setOpen] = useState(highlight);
  const [editing, setEditing] = useState(false);
  const [newVersion, setNewVersion] = useState(false);
  const [pending, start] = useTransition();
  const last = item.versions.at(-1)!;
  const doc = { title: item.title, fileName: item.fileName, fileSize: item.fileSize, fileUrl: item.fileUrl, previewUrl: item.previewUrl, meta: `v${item.versions.length} · ${personName(item.ownerId)}` };
  return (
    <div className={`fade-up rounded-[8px] border bg-white transition ${highlight ? "border-sd-primary shadow-[0_0_0_3px_rgba(0,109,216,0.18)]" : "border-sd-border"}`}>
      <div className="flex items-start gap-3 p-3">
        <button onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <KindIcon kind={item.kind} fileName={item.fileName} className="mt-0.5 h-5 w-5" />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium leading-snug">{item.title}</div>
            {!open && <div className="mt-0.5 truncate text-[12px] text-sd-muted">{stripMarkdown(item.content)}</div>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-sd-muted">
              <ScopeTags scope={item.scope} />
              {item.inheritedFrom && <span className="rounded-[4px] bg-sd-subtle px-1.5 py-0.5 font-medium text-sd-dark">inherited from {item.inheritedFrom}</span>}
              <SourceBadge source={item.source} />
              <span className="inline-flex items-center gap-1"><Avatar id={item.ownerId} size="xs" /> {personName(item.ownerId).split(" ")[0]}</span>
              <span>· v{item.versions.length}</span>
              <span>· {timeAgo(item.updatedAt)}</span>
            </div>
          </div>
        </button>
        {item.kind === "file" && (item.fileUrl || item.previewUrl) && <ViewDocumentButton doc={doc} />}
      </div>
      {open && (
        <div className="border-t border-sd-border px-3 pb-3 pt-2.5">
          {item.kind === "note" ? <Markdown className="text-[13px]">{item.content}</Markdown> : <p className="text-[13px] leading-relaxed text-sd-text">{item.content}</p>}
          {item.fileName && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-sd-subtle px-2 py-1 text-[11.5px] text-sd-muted"><Paperclip className="h-3 w-3" /> {item.fileName} · {item.fileSize}</span>
              {item.fileUrl && <a href={item.fileUrl} download={item.fileName} className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-[11.5px]"><Download className="h-3 w-3" /> Download</a>}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px]">
            <div className="text-sd-muted">Owner</div><div>{personName(item.ownerId)}</div>
            <div className="text-sd-muted">Origin</div><div>{item.origin === "customer" ? "Received from the customer" : "Created by SDWorx"}</div>
            <div className="text-sd-muted">Last change</div><div>{personName(last.byId)} · {fmtDate(last.at)}</div>
            <div className="text-sd-muted">Created</div><div>{personName(item.createdById)} · {fmtDate(item.createdAt)}</div>
            <div className="text-sd-muted">Topic</div><div>{item.topic}</div>
            {item.source.type !== "portal" && <><div className="text-sd-muted">Source</div><div>{item.source.ref}</div></>}
            {item.supersededById && <><div className="text-sd-muted">Status</div><div>Superseded by a newer item</div></>}
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sd-muted">Version history</div>
            <ul className="mt-1 space-y-1">
              {[...item.versions].reverse().map((v) => <li key={v.version} className="flex items-center gap-2 text-[11.5px] text-sd-muted"><span className="rounded-[4px] bg-sd-subtle px-1 font-mono text-sd-text">v{v.version}</span><Avatar id={v.byId} size="xs" /> {personName(v.byId)} · {fmtDate(v.at)} · <span className="text-slate-400">{v.note}</span></li>)}
            </ul>
          </div>
          {item.status === "active" && !item.inheritedFrom && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.kind === "note" && <button onClick={() => setEditing(true)} className="btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px]"><Pencil className="h-3.5 w-3.5" /> Edit note</button>}
              {item.kind === "file" && <button onClick={() => setNewVersion(!newVersion)} className="btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px]"><Upload className="h-3.5 w-3.5" /> New version</button>}
              {item.ownerId !== me && <button disabled={pending} onClick={() => start(() => claimItem(item.id))} className="btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] disabled:opacity-50"><UserPlus className="h-3.5 w-3.5" /> Take ownership</button>}
              <button disabled={pending} onClick={() => start(() => archiveItem(item.id))} className="btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-sd-muted disabled:opacity-50"><Archive className="h-3.5 w-3.5" /> Archive</button>
            </div>
          )}
          {newVersion && (
            <form className="mt-2 flex flex-wrap items-center gap-1.5 rounded-[4px] bg-sd-subtle p-2" action={(fd) => start(async () => { await uploadVersion(fd); setNewVersion(false); })}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="file" name="file" className="text-[11.5px]" />
              <input name="note" placeholder="What changed?" className="input min-w-0 flex-1 px-2 py-1 text-[12px]" />
              <button disabled={pending} className="btn-primary px-2.5 py-1.5 text-[12px] disabled:opacity-50">{pending ? "Uploading…" : "Save version"}</button>
            </form>
          )}
        </div>
      )}
      {editing && <NoteEditor mode="edit" title={item.title} initial={item.content} categories={categories} onClose={() => setEditing(false)} onSave={async (content, reason) => { await updateNote(item.id, content, reason); }} />}
    </div>
  );
}

function UploadForm({ nodeId, country, categories, defaultCategory, onDone }: { nodeId: string; country?: string; categories: Product[]; defaultCategory?: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  return (
    <form className="fade-up space-y-2 rounded-[8px] border border-sd-primary bg-sd-subtle p-3" action={(fd) => start(async () => { await uploadFile(fd); onDone(); })}>
      <input type="hidden" name="nodeId" value={nodeId} />
      <div className="flex items-center gap-2 text-[12.5px] font-semibold"><Upload className="h-4 w-4" /> Upload a document</div>
      <label className="flex cursor-pointer items-center gap-3 rounded-[4px] border border-dashed border-sd-border bg-white px-3 py-3 text-[12.5px] text-sd-muted hover:border-sd-primary">
        <Paperclip className="h-4 w-4" /> {name || "Choose a file (PDF, Word, Excel, image…)"}
        <input type="file" name="file" required className="hidden" onChange={(e) => setName(e.target.files?.[0]?.name ?? "")} />
      </label>
      <input name="title" placeholder="Title (defaults to the file name)" className="input w-full px-2.5 py-1.5 text-[13px]" />
      <textarea name="content" rows={2} placeholder="Short description of what is in the file" className="input w-full px-2.5 py-1.5 text-[13px]" />
      <div className="grid grid-cols-2 gap-2">
        <select name="category" defaultValue={defaultCategory} className="input px-2.5 py-1.5 text-[13px]">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="other">Other</option></select>
        <select name="origin" defaultValue="sdworx" className="input px-2.5 py-1.5 text-[13px]"><option value="sdworx">Created by SDWorx</option><option value="customer">Received from customer</option></select>
        <input name="topic" placeholder="Topic (e.g. Payroll cutoff)" className="input px-2.5 py-1.5 text-[13px]" />
        <input name="scope" defaultValue={country ?? "all"} placeholder="Scope: BE, DE or all" className="input px-2.5 py-1.5 text-[13px]" />
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={onDone} className="px-2.5 py-1.5 text-[12px] font-medium text-sd-muted">Cancel</button>
        <button disabled={pending} className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-[12px] disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> {pending ? "Uploading…" : "Upload"}</button>
      </div>
    </form>
  );
}
