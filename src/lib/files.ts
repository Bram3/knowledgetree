import fs from "fs";
import path from "path";
import { getCurrentUser, canAccess } from "./auth";
import { getDb, node } from "./db";
import { extensionOf } from "./uploads";
import { ALLOWED_TYPES } from "./upload-rules";
import { AccessDeniedError } from "./access";
import type { Person } from "./types";

/** Seeded demo documents. Not in public/ so they go through the access check. */
export const SEED_FILES_DIR = path.join(process.cwd(), "assets", "files");

/** Items that point at `url` as their original document or its preview. */
function itemsReferencing(url: string) {
  return getDb().items.filter((i) => i.fileUrl === url || i.previewUrl === url);
}

/** `user` may see the item: it hangs on a customer they are assigned to. */
function canSee(user: Person, nodeId: string) {
  const n = node(nodeId);
  return !!n && canAccess(user, n.companyId);
}

/**
 * Throws AccessDeniedError unless `user` may attach the existing file at `url` to a new item on customer `companyId`.
 * Only `/files/<name>` (seeded or mailbox documents) and `/api/files/<name>` (uploads) are allowed.
 * A file items already point at may only be linked again on that same customer (one the user is assigned to);
 * a file nobody points at yet only if it is a mailbox attachment of that customer.
 * Without this, pointing a new item at another customer's file URL would unlock that file.
 */
export function assertLinkableFile(user: Person, url: string, companyId: string) {
  const m = /^\/(files|api\/files)\/([A-Za-z0-9._-]+)$/.exec(url);
  if (!m || m[2].startsWith(".") || !canAccess(user, companyId)) throw new AccessDeniedError();
  const isSeed = m[1] === "files";
  if (isSeed && !fs.existsSync(path.join(SEED_FILES_DIR, m[2]))) throw new AccessDeniedError();
  const refs = itemsReferencing(url);
  if (refs.length > 0) {
    if (!refs.every((i) => canSee(user, i.nodeId) && node(i.nodeId)?.companyId === companyId)) throw new AccessDeniedError();
    return;
  }
  // Nobody filed it yet: only a mailbox attachment of this customer.
  if (!isSeed || MAILBOX_ATTACHMENTS[m[2]] !== companyId) throw new AccessDeniedError();
}

/**
 * Seeded documents that no item references until someone files them from the Outlook mock,
 * with the customer they belong to. Any other unreferenced file can't be linked.
 */
const MAILBOX_ATTACHMENTS: Record<string, string> = {
  "Nike_DE_Payroll_Calendar_Q4_2026.xlsx": "nike",
  "att-nike-de-calendar.pdf": "nike",
};

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
  const allowed = itemsReferencing(urlPath).find((i) => canSee(user, i.nodeId));
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
