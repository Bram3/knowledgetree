"use server";

import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, saveDb, resetDb, uid, node, detectNode, detectTopic, search, person, nodePath, company, categoryForTopic } from "./db";
import { getCurrentUser, USER_COOKIE } from "./auth";
import type { Item, ActivityAction } from "./types";

async function actor() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

function log(db: ReturnType<typeof getDb>, action: ActivityAction, nodeId: string, summary: string, actorId: string, itemId?: string) {
  const n = db.nodes.find((x) => x.id === nodeId)!;
  db.activity.push({ id: uid("a"), at: new Date().toISOString(), actorId, action, companyId: n.companyId, nodeId, itemId, summary });
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ---------- auth ----------

export async function login(personId: string) {
  const p = getDb().people.find((x) => x.id === personId);
  if (!p) return;
  (await cookies()).set(USER_COOKIE, p.id, { path: "/", httpOnly: true, sameSite: "lax" });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(USER_COOKIE);
  redirect("/login");
}

// ---------- knowledge ----------

export async function addNote(input: { nodeId: string; title: string; content: string; topic: string; category?: string; origin?: Item["origin"]; scope: string[]; source?: Item["source"] }) {
  const u = await actor();
  const id = uid("i");
  const at = new Date().toISOString();
  saveDb((db) => {
    db.items.push({
      id, nodeId: input.nodeId, kind: "note", title: input.title, content: input.content, topic: input.topic || "General",
      category: input.category || categoryForTopic(input.topic || ""), origin: input.origin ?? "sdworx",
      scope: input.scope.length ? input.scope : ["all"], ownerId: u.id, verifiedById: null, verifiedAt: null,
      createdById: u.id, createdAt: at, updatedAt: at, versions: [{ version: 1, byId: u.id, at, note: "Initial version" }],
      status: "active", source: input.source ?? { type: "portal", ref: "" },
    });
    const act: ActivityAction = input.source?.type === "teams" ? "captured_teams" : input.source?.type === "outlook" ? "captured_outlook" : "created";
    log(db, act, input.nodeId, `${act === "created" ? "added note" : act === "captured_teams" ? "saved from Teams" : "saved from Outlook"} ${input.title}`, u.id, id);
  });
  revalidateAll();
  return id;
}

export async function addFile(input: { nodeId: string; title: string; fileName: string; fileSize?: string; fileUrl?: string; previewUrl?: string; content: string; topic: string; category?: string; origin?: Item["origin"]; scope: string[]; source?: Item["source"] }) {
  const u = await actor();
  const id = uid("i");
  const at = new Date().toISOString();
  saveDb((db) => {
    db.items.push({
      id, nodeId: input.nodeId, kind: "file", title: input.title, fileName: input.fileName, fileSize: input.fileSize ?? "—", fileUrl: input.fileUrl, previewUrl: input.previewUrl, content: input.content, topic: input.topic || "General",
      category: input.category || categoryForTopic(input.topic || ""), origin: input.origin ?? "sdworx",
      scope: input.scope.length ? input.scope : ["all"], ownerId: u.id, verifiedById: null, verifiedAt: null,
      createdById: u.id, createdAt: at, updatedAt: at, versions: [{ version: 1, byId: u.id, at, note: "Initial upload" }],
      status: "active", source: input.source ?? { type: "portal", ref: "" },
    });
    const act: ActivityAction = input.source?.type === "outlook" ? "captured_outlook" : input.source?.type === "teams" ? "captured_teams" : "created";
    log(db, act, input.nodeId, `${act === "created" ? "uploaded" : act === "captured_outlook" ? "filed from Outlook" : "saved from Teams"} ${input.fileName}`, u.id, id);
  });
  revalidateAll();
  return id;
}

/** Real upload: stores the file under data/uploads and creates the item. Called with a FormData from the upload form. */
export async function uploadFile(fd: FormData) {
  await actor();
  const file = fd.get("file") as File | null;
  const nodeId = String(fd.get("nodeId"));
  let fileName = String(fd.get("fileName") || (file?.name ?? "document.pdf"));
  let fileUrl: string | undefined;
  let previewUrl: string | undefined;
  let fileSize = "—";
  if (file && file.size > 0) {
    fileName = file.name;
    const stored = `${uid("f")}-${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
    const dir = path.join(process.cwd(), "data", "uploads");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));
    fileUrl = `/api/files/${stored}`;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || ["png", "jpg", "jpeg", "gif", "svg", "txt", "md"].includes(ext ?? "")) previewUrl = fileUrl;
    fileSize = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  }
  const scope = String(fd.get("scope") || "all").split(",").map((s) => s.trim()).filter(Boolean);
  return addFile({ nodeId, title: String(fd.get("title") || fileName), fileName, fileSize, fileUrl, previewUrl, content: String(fd.get("content") || ""), topic: String(fd.get("topic") || ""), category: String(fd.get("category") || ""), origin: (String(fd.get("origin") || "sdworx") as Item["origin"]), scope });
}

/** Upload a new version of an existing document. */
export async function uploadVersion(fd: FormData) {
  const u = await actor();
  const itemId = String(fd.get("itemId"));
  const note = String(fd.get("note") || "New version");
  const file = fd.get("file") as File | null;
  saveDb((db) => {
    const it = db.items.find((i) => i.id === itemId);
    if (!it) return;
    const at = new Date().toISOString();
    if (file && file.size > 0) {
      const stored = `${uid("f")}-${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
      const dir = path.join(process.cwd(), "data", "uploads");
      fs.mkdirSync(dir, { recursive: true });
      // FormData files are read synchronously here via the buffered arrayBuffer below
      pendingWrites.push({ path: path.join(dir, stored), file });
      it.fileName = file.name;
      it.fileUrl = `/api/files/${stored}`;
      const ext = file.name.split(".").pop()?.toLowerCase();
      it.previewUrl = ext === "pdf" || ["png", "jpg", "jpeg", "gif", "svg", "txt", "md"].includes(ext ?? "") ? it.fileUrl : undefined;
      it.fileSize = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    }
    it.versions.push({ version: it.versions.length + 1, byId: u.id, at, note });
    it.updatedAt = at;
    log(db, "new_version", it.nodeId, `uploaded version ${it.versions.length} of ${it.title}`, u.id, it.id);
  });
  for (const w of pendingWrites.splice(0)) fs.writeFileSync(w.path, Buffer.from(await w.file.arrayBuffer()));
  revalidateAll();
}
const pendingWrites: { path: string; file: File }[] = [];

export async function updateNote(itemId: string, content: string, note: string) {
  const u = await actor();
  saveDb((db) => {
    const it = db.items.find((i) => i.id === itemId);
    if (!it) return;
    const at = new Date().toISOString();
    it.content = content;
    it.versions.push({ version: it.versions.length + 1, byId: u.id, at, note: note || "Edited" });
    it.updatedAt = at;
    log(db, "updated", it.nodeId, `edited ${it.title}`, u.id, it.id);
  });
  revalidateAll();
}

export async function claimItem(itemId: string) {
  const u = await actor();
  saveDb((db) => {
    const it = db.items.find((i) => i.id === itemId);
    if (!it) return;
    it.ownerId = u.id;
    it.updatedAt = new Date().toISOString();
    log(db, "updated", it.nodeId, `took ownership of ${it.title}`, u.id, it.id);
  });
  revalidateAll();
}

export async function addVersion(itemId: string, note: string) {
  const u = await actor();
  saveDb((db) => {
    const it = db.items.find((i) => i.id === itemId);
    if (!it) return;
    const at = new Date().toISOString();
    it.versions.push({ version: it.versions.length + 1, byId: u.id, at, note });
    it.updatedAt = at;
    log(db, "new_version", it.nodeId, `uploaded version ${it.versions.length} of ${it.title}`, u.id, it.id);
  });
  revalidateAll();
}

export async function archiveItem(itemId: string) {
  const u = await actor();
  saveDb((db) => {
    const it = db.items.find((i) => i.id === itemId);
    if (!it) return;
    it.status = "superseded";
    it.updatedAt = new Date().toISOString();
    log(db, "superseded", it.nodeId, `archived ${it.title}`, u.id, it.id);
  });
  revalidateAll();
}

export async function addNode(input: { companyId: string; parentId: string; name: string; type: "country" | "entity" | "division" | "team"; country?: string }) {
  const u = await actor();
  const id = uid("n");
  saveDb((db) => {
    db.nodes.push({ id, companyId: input.companyId, parentId: input.parentId, name: input.name, type: input.type, country: input.country, expertIds: [u.id] });
    log(db, "node_added", id, `added ${input.name} to the organigram`, u.id);
  });
  revalidateAll();
  return id;
}

export async function resetDemo() {
  resetDb();
  revalidateAll();
}

// ---------- POC helpers used by the Teams / Outlook mock-ups ----------

export async function suggestNode(text: string) {
  const u = await actor();
  const hit = detectNode(text, u.customerIds);
  if (!hit) return null;
  const topic = detectTopic(text);
  const related = getDb().items
    .filter((i) => i.nodeId === hit.node.id && i.status === "active" && i.topic === topic)
    .map((i) => ({ id: i.id, title: i.title }));
  return { nodeId: hit.node.id, confidence: hit.confidence, path: nodePath(hit.node.id).map((n) => n.name), companyId: hit.node.companyId, country: hit.node.country ?? null, topic, category: categoryForTopic(topic), related };
}

export type BotAnswer = {
  found: boolean;
  category?: string;
  origin?: "sdworx" | "customer";
  answer?: string;
  title?: string;
  itemId?: string;
  nodeId?: string;
  companyId?: string;
  path?: string[];
  owner?: string;
  updated?: string;
  version?: number;
  source?: string;
  expert?: string;
  alternatives?: { title: string; status: string }[];
};

export async function askBot(question: string): Promise<BotAnswer> {
  const u = await actor();
  const guess = detectNode(question, u.customerIds);
  const hits = search(question, { companyIds: u.customerIds, companyId: guess?.node.companyId, country: guess?.node.country ?? undefined }).filter((h) => h.item.status === "active");
  const n = guess?.node;
  const expertId = n?.expertIds[0] ?? nodePath(n?.id ?? "").flatMap((p) => p.expertIds)[0];
  const expert = person(expertId ?? null);
  if (!hits.length) {
    return { found: false, expert: expert?.name, nodeId: n?.id, companyId: n?.companyId, path: n ? nodePath(n.id).map((p) => p.name) : undefined };
  }
  const best = hits[0];
  const c = company(best.node.companyId);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return {
    found: true,
    category: best.item.category,
    origin: best.item.origin,
    answer: best.item.content,
    title: best.item.title,
    itemId: best.item.id,
    nodeId: best.node.id,
    companyId: c?.id,
    path: nodePath(best.node.id).map((p) => p.name),
    owner: person(best.item.ownerId)?.name,
    updated: `${person(best.item.versions.at(-1)?.byId)?.name ?? "unknown"}, ${fmt(best.item.updatedAt)}`,
    version: best.item.versions.length,
    source: best.item.source.type === "portal" ? undefined : best.item.source.ref,
    expert: expert?.name ?? person(best.node.expertIds[0])?.name,
    alternatives: hits.slice(1, 3).map((h) => ({ title: h.item.title, status: h.item.status })),
  };
}

export async function nodeSummary(nodeId: string) {
  const n = node(nodeId);
  if (!n) return null;
  const db = getDb();
  const items = db.items.filter((i) => i.nodeId === nodeId && i.status === "active").map((i) => ({ id: i.id, title: i.title, kind: i.kind, owner: person(i.ownerId)?.name ?? null, updatedAt: i.updatedAt, category: i.category, origin: i.origin }));
  return { name: n.name, path: nodePath(nodeId).map((p) => p.name), items, experts: n.expertIds.map((e) => person(e)?.name).filter(Boolean) as string[] };
}
