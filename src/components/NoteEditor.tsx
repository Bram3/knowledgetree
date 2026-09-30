"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Bold, Italic, Heading2, List, ListOrdered, Link2, Quote, Table, Code, Eye, PenLine, Columns2 } from "lucide-react";
import { Markdown } from "./Markdown";
import type { Product } from "@/lib/catalog";

type Base = { onClose: () => void; categories: Product[] };
type EditProps = Base & { mode: "edit"; title: string; initial: string; onSave: (content: string, reason: string) => Promise<void> };
type NewProps = Base & { mode: "new"; defaultCategory?: string; country?: string; onCreate: (input: { title: string; content: string; category: string; topic: string; scope: string[] }) => Promise<void> };

const TEMPLATE = "## Summary\n\nWhat a colleague needs to know in one or two sentences.\n\n## Details\n\n- Fact 1\n- Fact 2\n\n> Source: who confirmed this and when";

export function NoteEditor(props: EditProps | NewProps) {
  const [content, setContent] = useState(props.mode === "edit" ? props.initial : TEMPLATE);
  const [title, setTitle] = useState(props.mode === "edit" ? props.title : "");
  const [reason, setReason] = useState("");
  const [view, setView] = useState<"split" | "write" | "preview">("split");
  const [pending, start] = useTransition();
  const ta = useRef<HTMLTextAreaElement>(null);

  const wrap = (before: string, after = before, placeholder = "text") => {
    const el = ta.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = content.slice(s, e) || placeholder;
    const next = content.slice(0, s) + before + sel + after + content.slice(e);
    setContent(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); });
  };
  const linePrefix = (prefix: string) => {
    const el = ta.current; if (!el) return;
    const s = el.selectionStart;
    const lineStart = content.lastIndexOf("\n", s - 1) + 1;
    const next = content.slice(0, lineStart) + prefix + content.slice(lineStart);
    setContent(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + prefix.length, s + prefix.length); });
  };
  const insert = (text: string) => {
    const el = ta.current; if (!el) return;
    const s = el.selectionStart;
    setContent(content.slice(0, s) + text + content.slice(s));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + text.length, s + text.length); });
  };

  const tools = [
    { icon: Bold, label: "Bold", action: "bold" },
    { icon: Italic, label: "Italic", action: "italic" },
    { icon: Heading2, label: "Heading", action: "heading" },
    { icon: List, label: "Bullet list", action: "ul" },
    { icon: ListOrdered, label: "Numbered list", action: "ol" },
    { icon: Quote, label: "Quote", action: "quote" },
    { icon: Code, label: "Code", action: "code" },
    { icon: Link2, label: "Link", action: "link" },
    { icon: Table, label: "Table", action: "table" },
  ] as const;
  const apply = (action: (typeof tools)[number]["action"]) => {
    switch (action) {
      case "bold": return wrap("**");
      case "italic": return wrap("*");
      case "heading": return linePrefix("## ");
      case "ul": return linePrefix("- ");
      case "ol": return linePrefix("1. ");
      case "quote": return linePrefix("> ");
      case "code": return wrap("`");
      case "link": return wrap("[", "](https://)", "link text");
      case "table": return insert("\n| Column | Column |\n| --- | --- |\n| value | value |\n");
    }
  };

  const submit = () => start(async () => {
    if (props.mode === "edit") await props.onSave(content, reason);
    else {
      const fd = formRef.current ? new FormData(formRef.current) : null;
      await props.onCreate({ title: title || "Untitled note", content, category: String(fd?.get("category") ?? props.defaultCategory ?? props.categories[0]?.id ?? "other"), topic: String(fd?.get("topic") ?? ""), scope: String(fd?.get("scope") || props.country || "all").split(",").map((s) => s.trim()).filter(Boolean) });
    }
    props.onClose();
  });
  const formRef = useRef<HTMLFormElement>(null);
  const onClose = props.onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050607]/60 p-6" onClick={props.onClose}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[8px] bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-sd-border px-5 py-3">
          <PenLine className="h-4 w-4 text-sd-primary" />
          {props.mode === "edit" ? <div className="min-w-0 flex-1 truncate text-[14px] font-semibold">{props.title}</div> : <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" className="input min-w-0 flex-1 px-3 py-1.5 text-[14px] font-semibold" autoFocus />}
          <div className="flex rounded-[4px] border border-sd-border p-0.5">
            {([["write", PenLine, "Write"], ["split", Columns2, "Split"], ["preview", Eye, "Preview"]] as const).map(([k, Icon, l]) => (
              <button key={k} type="button" onClick={() => setView(k)} className={`inline-flex items-center gap-1 rounded-[2px] px-2 py-1 text-[12px] font-medium ${view === k ? "bg-sd-dark text-white" : "text-sd-muted hover:text-sd-text"}`}><Icon className="h-3.5 w-3.5" /> {l}</button>
            ))}
          </div>
          <button onClick={props.onClose} className="btn-secondary p-2" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        {props.mode === "new" && (
          <form ref={formRef} className="flex items-center gap-2 border-b border-sd-border bg-sd-subtle px-5 py-2 text-[12.5px]" onSubmit={(e) => e.preventDefault()}>
            <span className="text-sd-muted">Category</span>
            <select name="category" defaultValue={props.defaultCategory ?? props.categories[0]?.id} className="input px-2 py-1">{props.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="other">Other</option></select>
            <span className="ml-2 text-sd-muted">Topic</span>
            <input name="topic" placeholder="e.g. Payroll cutoff" className="input w-44 px-2 py-1" />
            <span className="ml-2 text-sd-muted">Scope</span>
            <input name="scope" defaultValue={props.country ?? "all"} className="input w-24 px-2 py-1" />
          </form>
        )}

        <div className="flex items-center gap-0.5 border-b border-sd-border px-4 py-1.5">
          {tools.map((t) => <button key={t.label} type="button" title={t.label} onClick={() => apply(t.action)} className="rounded-[4px] p-1.5 text-sd-muted hover:bg-sd-subtle hover:text-sd-text"><t.icon className="h-4 w-4" /></button>)}
          <span className="ml-auto text-[11px] text-sd-muted">Markdown · {content.length} characters</span>
        </div>

        <div className={`grid min-h-0 flex-1 ${view === "split" ? "grid-cols-2" : "grid-cols-1"}`}>
          {view !== "preview" && <textarea ref={ta} value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false} className={`h-full w-full resize-none p-5 font-mono text-[13px] leading-relaxed outline-none ${view === "split" ? "border-r border-sd-border" : ""}`} />}
          {view !== "write" && <div className="h-full overflow-y-auto bg-white p-6"><Markdown className="text-[14px]">{content || "*Nothing to preview yet.*"}</Markdown></div>}
        </div>

        <div className="flex items-center gap-2 border-t border-sd-border bg-sd-subtle px-5 py-3">
          {props.mode === "edit" ? <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What changed and why? (kept in the version history)" className="input flex-1 px-3 py-2 text-[13px]" /> : <span className="flex-1 text-[12.5px] text-sd-muted">Saved as an SD Worx note, version 1, under your name.</span>}
          <button type="button" onClick={props.onClose} className="btn-secondary px-3 py-2 text-[13px]">Cancel</button>
          <button type="button" disabled={pending || !content.trim()} onClick={submit} className="btn-primary px-4 py-2 text-[13px] disabled:opacity-50">{pending ? "Saving…" : props.mode === "edit" ? "Save new version" : "Create note"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
