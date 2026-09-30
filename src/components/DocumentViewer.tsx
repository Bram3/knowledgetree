"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download, ExternalLink, FileText, Eye } from "lucide-react";
import { KindIcon } from "./ui";

export type ViewerDoc = { title: string; fileName?: string; fileSize?: string; fileUrl?: string; previewUrl?: string; meta?: string };

export function DocumentViewer({ doc, onClose }: { doc: ViewerDoc; onClose: () => void }) {
  const ext = doc.fileName?.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["png", "jpg", "jpeg", "gif", "svg"].includes(ext);
  const previewIsPdf = !!doc.previewUrl && doc.previewUrl !== doc.fileUrl;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050607]/60 p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[8px] bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-sd-border px-5 py-3">
          <KindIcon kind="file" fileName={doc.fileName} className="h-5 w-5" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{doc.title}</div>
            <div className="truncate text-[11.5px] text-sd-muted">{doc.fileName}{doc.fileSize ? ` · ${doc.fileSize}` : ""}{doc.meta ? ` · ${doc.meta}` : ""}{previewIsPdf ? " · PDF preview of the original" : ""}</div>
          </div>
          {doc.fileUrl && <a href={doc.fileUrl} download={doc.fileName} className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px]"><Download className="h-4 w-4" /> Download{previewIsPdf ? ` .${ext}` : ""}</a>}
          {doc.previewUrl && <a href={doc.previewUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px]"><ExternalLink className="h-4 w-4" /> Open in tab</a>}
          <button onClick={onClose} className="btn-secondary p-2" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 bg-sd-subtle">
          {doc.previewUrl ? (
            isImage && doc.previewUrl === doc.fileUrl ? <div className="grid h-full place-items-center p-6">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={doc.previewUrl} alt={doc.title} className="max-h-full max-w-full rounded-[4px] bg-white shadow" /></div> : <iframe src={`${doc.previewUrl}#toolbar=0&navpanes=0`} title={doc.title} className="h-full w-full" />
          ) : (
            <div className="grid h-full place-items-center text-center">
              <div>
                <FileText className="mx-auto h-10 w-10 text-sd-muted" />
                <div className="mt-3 text-[14px] font-medium">No inline preview for .{ext || "this"} files</div>
                <div className="mt-1 text-[12.5px] text-sd-muted">Download the document to open it in its own application.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** A button that opens the viewer for one document. */
export function ViewDocumentButton({ doc, className = "btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px]", label = "View" }: { doc: ViewerDoc; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} className={className}><Eye className="h-3.5 w-3.5" /> {label}</button>
      {open && <DocumentViewer doc={doc} onClose={() => setOpen(false)} />}
    </>
  );
}
