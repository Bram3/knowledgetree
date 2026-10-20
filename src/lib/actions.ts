"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, saveDb, resetDb, uid, detectNode, detectTopic, search, person, nodePath, company, categoryForTopic } from "./db";
import { getCurrentUser, setSessionCookie, USER_COOKIE } from "./auth";
import { requireCustomerAccess, requireItemAccess, requireCompanyAccess, AccessDeniedError } from "./access";
import type { Item, ActivityAction, Person } from "./types";
import { storeUpload } from "./uploads";
import { assertLinkableFile } from "./files";
import { idList, idString, MAX_CONTENT, MAX_QUESTION, MAX_TEXT, oneOf, optionalText, record, textString, ValidationError } from "./validation";
import { revalidateAll } from "./revalidate";

async function actor() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

function log(db: ReturnType<typeof getDb>, action: ActivityAction, nodeId: string, summary: string, actorId: string, itemId?: string) {
  const n = db.nodes.find((x) => x.id === nodeId)!;
  db.activity.push({ id: uid("a"), at: new Date().toISOString(), actorId, action, companyId: n.companyId, nodeId, itemId, summary });
}

// ---------- auth ----------

export async function login(personId: string) {
  const p = getDb().people.find((x) => x.id === personId);
  if (!p) return;
  await setSessionCookie(p.id);
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(USER_COOKIE);
  redirect("/login");
}

// ---------- knowledge ----------

// Server actions are public POST endpoints: every argument is checked (type, length, allowed values) before use.
const ORIGINS = ["sdworx", "customer"] as const;
const SOURCE_TYPES = ["portal", "teams", "outlook"] as const;
const NODE_TYPES = ["country", "entity", "division", "team"] as const;
const MAX_SCOPE = 50;

type NoteInput = { nodeId: string; title: string; content: string; topic: string; category?: string; origin?: Item["origin"]; scope: string[]; source?: Item["source"] };

/** Checks the fields notes and files share. Throws ValidationError. */
function parseNoteInput(raw: unknown): NoteInput {
  const i = record(raw, "input");
  const scope = idList(i.scope, MAX_SCOPE, "scope");
  let source: Item["source"] | undefined;
  if (i.source !== undefined) {
    const s = record(i.source, "source");
    source = { type: oneOf(s.type, SOURCE_TYPES, "source type"), ref: textString(s.ref, MAX_TEXT, "source ref") };
  }
  return {
    nodeId: idString(i.nodeId, "node id"),
    title: textString(i.title, MAX_TEXT, "title"),
    content: textString(i.content, MAX_CONTENT, "content"),
    topic: textString(i.topic ?? "", MAX_TEXT, "topic"),
    category: optionalText(i.category, MAX_TEXT, "category"),
    origin: i.origin === undefined ? undefined : oneOf(i.origin, ORIGINS, "origin"),
    scope,
    source,
  };
}

function parseFileInput(raw: unknown): FileInput {
  const i = record(raw, "input");
  return {
    ...parseNoteInput(raw),
    fileName: textString(i.fileName, MAX_TEXT, "file name"),
    fileSize: optionalText(i.fileSize, 50, "file size"),
    fileUrl: optionalText(i.fileUrl, MAX_TEXT, "file url"),
    previewUrl: optionalText(i.previewUrl, MAX_TEXT, "preview url"),
  };
}

export async function addNote(raw: NoteInput) {
  const input = parseNoteInput(raw);
  const { user: u } = await requireCustomerAccess(input.nodeId);
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

type FileInput = NoteInput & { fileName: string; fileSize?: string; fileUrl?: string; previewUrl?: string };

/** Link an existing file (seeded/mailbox document or an earlier upload) as a new item. URLs are checked by assertLinkableFile. */
export async function addFile(raw: FileInput) {
  const input = parseFileInput(raw);
  const { user: u, node } = await requireCustomerAccess(input.nodeId);
  for (const url of [input.fileUrl, input.previewUrl]) if (url) assertLinkableFile(u, url, node.companyId);
  return createFileItem(u, input);
}

function createFileItem(u: Person, input: FileInput) {
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

/** Checks the upload form (it can be POSTed directly) and returns it typed, like validateIngestInput. Throws ValidationError. */
function parseUploadForm(fd: FormData): { input: FileInput; file: File | null } {
  const text = (name: string, max = MAX_TEXT) => {
    const v = fd.get(name) ?? "";
    if (typeof v !== "string" || v.length > max) throw new ValidationError(`Bad ${name}`);
    return v.trim();
  };
  const nodeId = idString(fd.get("nodeId"), "node id");
  const origin = text("origin") || "sdworx";
  if (origin !== "sdworx" && origin !== "customer") throw new ValidationError("Bad origin");
  const raw = fd.get("file");
  if (raw !== null && typeof raw === "string") throw new ValidationError("Bad file");
  const file = raw && raw.size > 0 ? raw : null;
  const fileName = file?.name ?? (text("fileName") || "document.pdf");
  const scope = (text("scope") || "all").split(",").map((s) => s.trim()).filter(Boolean);
  return { file, input: { nodeId, title: text("title") || fileName, fileName, content: text("content", MAX_CONTENT), topic: text("topic"), category: text("category"), origin, scope } };
}

/** Real upload: validates and stores the file under data/uploads and creates the item. Called with a FormData from the upload form. */
export async function uploadFile(fd: FormData) {
  const { input, file } = parseUploadForm(fd);
  const { user } = await requireCustomerAccess(input.nodeId);
  const stored = file ? await storeUpload(file) : null;
  return createFileItem(user, stored ? { ...input, ...stored } : input);
}

/** Upload a new version of an existing document (not a note: notes get versions by editing). */
export async function uploadVersion(fd: FormData) {
  const itemId = idString(fd.get("itemId"), "item id");
  const note = optionalText(fd.get("note"), MAX_TEXT, "note") || "New version";
  const file = fd.get("file");
  if (typeof file === "string") throw new ValidationError("Bad file");
  const { user: u, item } = await requireItemAccess(itemId);
  if (item.kind !== "file") throw new ValidationError("Only documents get new file versions");
  const stored = file && file.size > 0 ? await storeUpload(file) : null;
  saveDb((db) => {
    const it = db.items.find((i) => i.id === itemId);
    if (!it) return;
    const at = new Date().toISOString();
    if (stored) {
      it.fileName = stored.fileName;
      it.fileUrl = stored.fileUrl;
      it.previewUrl = stored.previewUrl;
      it.fileSize = stored.fileSize;
    }
    it.versions.push({ version: it.versions.length + 1, byId: u.id, at, note });
    it.updatedAt = at;
    log(db, "new_version", it.nodeId, `uploaded version ${it.versions.length} of ${it.title}`, u.id, it.id);
  });
  revalidateAll();
}

export async function updateNote(itemId: string, rawContent: string, rawNote: string) {
  const content = textString(rawContent, MAX_CONTENT, "content");
  const note = optionalText(rawNote, MAX_TEXT, "note");
  const { user: u } = await requireItemAccess(idString(itemId, "item id"));
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
  const { user: u } = await requireItemAccess(idString(itemId, "item id"));
  saveDb((db) => {
    const it = db.items.find((i) => i.id === itemId);
    if (!it) return;
    it.ownerId = u.id;
    it.updatedAt = new Date().toISOString();
    log(db, "updated", it.nodeId, `took ownership of ${it.title}`, u.id, it.id);
  });
  revalidateAll();
}

export async function addVersion(itemId: string, rawNote: string) {
  const note = textString(rawNote, MAX_TEXT, "note");
  const { user: u } = await requireItemAccess(idString(itemId, "item id"));
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
  const { user: u } = await requireItemAccess(idString(itemId, "item id"));
  saveDb((db) => {
    const it = db.items.find((i) => i.id === itemId);
    if (!it) return;
    it.status = "superseded";
    it.updatedAt = new Date().toISOString();
    log(db, "superseded", it.nodeId, `archived ${it.title}`, u.id, it.id);
  });
  revalidateAll();
}

/** Checks the add-node form: the types and countries it offers, a non-empty name. Throws ValidationError. */
function parseNodeInput(raw: unknown) {
  const i = record(raw, "node");
  const name = textString(i.name, MAX_TEXT, "name").trim();
  if (!name) throw new ValidationError("Bad name");
  const country = optionalText(i.country, 2, "country") || undefined;
  if (country !== undefined && !/^[A-Z]{2}$/.test(country)) throw new ValidationError("Bad country");
  return { companyId: idString(i.companyId, "customer id"), parentId: idString(i.parentId, "parent id"), name, type: oneOf(i.type, NODE_TYPES, "node type"), country };
}

export async function addNode(raw: { companyId: string; parentId: string; name: string; type: "country" | "entity" | "division" | "team"; country?: string }) {
  const input = parseNodeInput(raw);
  const { user: u, node: parent } = await requireCustomerAccess(input.parentId);
  await requireCompanyAccess(input.companyId);
  if (parent.companyId !== input.companyId) throw new AccessDeniedError();
  const id = uid("n");
  saveDb((db) => {
    db.nodes.push({ id, companyId: input.companyId, parentId: input.parentId, name: input.name, type: input.type, country: input.country, expertIds: [u.id] });
    log(db, "node_added", id, `added ${input.name} to the organigram`, u.id);
  });
  revalidateAll();
  return id;
}

export async function resetDemo() {
  await actor();
  resetDb();
  revalidateAll();
}

// ---------- POC helpers used by the Teams / Outlook mock-ups ----------

export async function suggestNode(rawText: string) {
  const text = textString(rawText, MAX_CONTENT, "text");
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

export async function askBot(rawQuestion: string): Promise<BotAnswer> {
  const question = textString(rawQuestion, MAX_QUESTION, "question");
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
  const { node: n } = await requireCustomerAccess(idString(nodeId, "node id"));
  const db = getDb();
  const items = db.items.filter((i) => i.nodeId === nodeId && i.status === "active").map((i) => ({ id: i.id, title: i.title, kind: i.kind, owner: person(i.ownerId)?.name ?? null, updatedAt: i.updatedAt, category: i.category, origin: i.origin }));
  return { name: n.name, path: nodePath(nodeId).map((p) => p.name), items, experts: n.expertIds.map((e) => person(e)?.name).filter(Boolean) as string[] };
}
