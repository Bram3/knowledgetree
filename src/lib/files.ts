import fs from "fs";
import path from "path";
import { getCurrentUser, canAccess } from "./auth";
import { getDb, node } from "./db";
import { ALLOWED_TYPES, extensionOf } from "./uploads";
import { AccessDeniedError } from "./access";
import type { Person } from "./types";

/** Seeded demo documents. Not in public/ so they go through the access check. */
export const SEED_FILES_DIR = path.join(process.cwd(), "assets", "files");

/**
 * Throws AccessDeniedError unless `user` may attach the existing file at `url` to a new item.
 * Only `/files/<name>` (seeded or mailbox documents) and `/api/files/<name>` (uploads) are allowed,
 * and only if every item already pointing at that URL belongs to a customer the user is assigned to.
 * Without this, pointing a new item at another customer's file URL would unlock that file.
 */
export function assertLinkableFile(user: Person, url: string) {
  const m = /^\/(files|api\/files)\/([A-Za-z0-9._-]+)$/.exec(url);
  if (!m || m[2].startsWith(".")) throw new AccessDeniedError();
  const refs = getDb().items.filter((i) => i.fileUrl === url || i.previewUrl === url);
  const visible = (nodeId: string) => {
    const n = node(nodeId);
    return !!n && canAccess(user, n.companyId);
  };
  if (!refs.every((i) => visible(i.nodeId))) throw new AccessDeniedError();
  if (m[1] === "files" ? !fs.existsSync(path.join(SEED_FILES_DIR, m[2])) : refs.length === 0) throw new AccessDeniedError();
}

/** RFC 6266 Content-Disposition: ASCII fallback plus RFC 5987 UTF-8 name. Only PDFs are inline. */
export function contentDisposition(fileName: string, inline: boolean) {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * Serves `dir/name` for the URL `urlPath`, but only if the signed-in person is assigned to the
 * customer of an item that references that URL (as fileUrl or previewUrl).
 * 401 when not signed in; 404 when the file is unknown or belongs to another customer.
 */
export async function serveKnowledgeFile(dir: string, name: string, urlPath: string): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const safe = path.basename(name);
  if (safe !== name) return new Response("Not found", { status: 404 });
  const refs = getDb().items.filter((i) => i.fileUrl === urlPath || i.previewUrl === urlPath);
  const allowed = refs.find((i) => {
    const n = node(i.nodeId);
    return n && canAccess(user, n.companyId);
  });
  const file = path.join(dir, safe);
  if (!allowed || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const ext = extensionOf(safe);
  const isPdf = ext === "pdf";
  const downloadName = allowed.fileUrl === urlPath && allowed.fileName ? allowed.fileName : safe;
  return new Response(fs.readFileSync(file), {
    headers: {
      "Content-Type": ALLOWED_TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": contentDisposition(downloadName, isPdf),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
