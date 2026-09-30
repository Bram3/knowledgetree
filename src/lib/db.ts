import fs from "fs";
import path from "path";
import { seed } from "./seed";
import type { Db, Item, OrgNode, Activity } from "./types";
import { PRODUCTS, OTHER_CATEGORY, type Product } from "./catalog";

const FILE = path.join(process.cwd(), "data", "db.json");

declare global {
  var __ktdb: Db | undefined;
}

function load(): Db {
  if (globalThis.__ktdb) return globalThis.__ktdb;
  try {
    if (fs.existsSync(FILE)) {
      globalThis.__ktdb = JSON.parse(fs.readFileSync(FILE, "utf8")) as Db;
      return globalThis.__ktdb;
    }
  } catch {}
  globalThis.__ktdb = structuredClone(seed);
  persist();
  return globalThis.__ktdb;
}

function persist() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(globalThis.__ktdb, null, 2));
  } catch {}
}

export function getDb(): Db {
  return load();
}

export function saveDb(mutate: (db: Db) => void) {
  const db = load();
  mutate(db);
  persist();
}

export function resetDb() {
  globalThis.__ktdb = structuredClone(seed);
  persist();
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- helpers ----------

export function person(id: string | null | undefined) {
  return getDb().people.find((p) => p.id === id) ?? null;
}

export function company(id: string) {
  return getDb().companies.find((c) => c.id === id) ?? null;
}

export function node(id: string) {
  return getDb().nodes.find((n) => n.id === id) ?? null;
}

export function companyNodes(companyId: string) {
  return getDb().nodes.filter((n) => n.companyId === companyId);
}

export function ancestors(nodeId: string): OrgNode[] {
  const out: OrgNode[] = [];
  let cur = node(nodeId);
  while (cur?.parentId) {
    cur = node(cur.parentId);
    if (cur) out.push(cur);
  }
  return out;
}

export function nodePath(nodeId: string): OrgNode[] {
  const n = node(nodeId);
  if (!n) return [];
  return [...ancestors(nodeId).reverse(), n];
}

export function itemsForNode(nodeId: string) {
  return getDb().items.filter((i) => i.nodeId === nodeId);
}

export function inheritedItems(nodeId: string) {
  const anc = ancestors(nodeId);
  return anc.flatMap((a) => itemsForNode(a.id).filter((i) => i.status === "active").map((i) => ({ item: i, from: a })));
}

export function nodeCountry(nodeId: string): string | undefined {
  const n = node(nodeId);
  if (!n) return undefined;
  if (n.country) return n.country;
  return ancestors(nodeId).find((a) => a.country)?.country;
}

export type CompanySummary = { nodes: number; items: number; countries: string[]; lastUpdated: string | null; lastUpdatedBy: string | null };

export function companySummary(companyId: string): CompanySummary {
  const nodes = companyNodes(companyId);
  const ids = new Set(nodes.map((n) => n.id));
  const items = getDb().items.filter((i) => ids.has(i.nodeId) && i.status === "active");
  const last = [...getDb().activity].filter((a) => a.companyId === companyId).sort((a, b) => b.at.localeCompare(a.at))[0];
  return {
    nodes: nodes.length,
    items: items.length,
    countries: [...new Set(nodes.map((n) => n.country).filter(Boolean) as string[])],
    lastUpdated: last?.at ?? null,
    lastUpdatedBy: last ? person(last.actorId)?.name ?? null : null,
  };
}

/** The fixed categories of a customer: its subscribed products, in catalog order. */
export function companyCategories(companyId: string): Product[] {
  const c = company(companyId);
  const ids = c?.products ?? [];
  return PRODUCTS.filter((p) => ids.includes(p.id));
}

export type NodeStats = { items: number; inherited: number; byCategory: Record<string, number>; customerDocs: number };

export function nodeStats(nodeId: string): NodeStats {
  const items = itemsForNode(nodeId).filter((i) => i.status === "active");
  const byCategory: Record<string, number> = {};
  for (const i of items) byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
  return { items: items.length, inherited: inheritedItems(nodeId).length, byCategory, customerDocs: items.filter((i) => i.origin === "customer").length };
}

export function categoryForTopic(topic: string): string {
  const t = topic.toLowerCase();
  if (/payroll|cutoff|calendar|tax|lohn|premium|wage|cao|cla|collective/.test(t)) return "payroll";
  if (/time|roster|shift|badge|attendance/.test(t)) return "time";
  if (/onboard|contact|benefit|meal|bonus|flexi|hr/.test(t)) return "hr-admin";
  if (/legal|statute|mandate|compliance|kurzarbeit/.test(t)) return "legal";
  if (/report|dashboard|headcount/.test(t)) return "reporting";
  if (/contract|agreement|sla|escalation|msa/.test(t)) return "contract";
  return OTHER_CATEGORY.id;
}

export type FeedActivity = Activity & { companyName?: string; nodeName?: string };

export function recentActivity(limit = 20, opts: { companyId?: string; actorId?: string; companyIds?: string[] } = {}): FeedActivity[] {
  return [...getDb().activity]
    .filter((a) => (!opts.companyId || a.companyId === opts.companyId) && (!opts.actorId || a.actorId === opts.actorId) && (!opts.companyIds || opts.companyIds.includes(a.companyId)))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .map((a) => ({ ...a, companyName: company(a.companyId)?.name, nodeName: node(a.nodeId)?.name }));
}

// ---------- search ----------

export type SearchHit = { item: Item; node: OrgNode; score: number; matched: string[] };

const STOP = new Set(["what", "is", "the", "for", "of", "a", "an", "in", "at", "to", "and", "or", "do", "does", "we", "our", "how", "when", "which", "on", "it", "are", "was", "be", "this", "that", "with", "about", "please", "can", "you", "wat", "de", "het", "een", "van", "voor", "bij"]);

export function search(q: string, opts: { companyIds?: string[]; companyId?: string; country?: string } = {}): SearchHit[] {
  const terms = q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));
  if (!terms.length) return [];
  const db = getDb();
  const hits: SearchHit[] = [];
  for (const item of db.items) {
    const n = node(item.nodeId);
    if (!n) continue;
    if (opts.companyIds && !opts.companyIds.includes(n.companyId)) continue;
    if (opts.companyId && n.companyId !== opts.companyId) continue;
    const c = company(n.companyId);
    const hay = `${item.title} ${item.content} ${item.topic} ${item.fileName ?? ""} ${n.name} ${c?.name ?? ""} ${nodePath(n.id).map((p) => p.name).join(" ")}`.toLowerCase();
    const matched = terms.filter((t) => hay.includes(t));
    if (matched.length < Math.ceil(terms.length / 2)) continue;
    let score = matched.length * 10;
    if (item.title.toLowerCase().includes(q.toLowerCase())) score += 15;
    if (opts.country) score += item.scope.includes(opts.country) || item.scope.includes("all") ? 8 : -8;
    if (item.status === "superseded") score -= 25;
    score += terms.filter((t) => item.title.toLowerCase().includes(t)).length * 2; // terms in the title count extra
    if (item.source.type !== "portal") score -= 4; // captured chats and emails are context; curated items are the answer
    score += Math.max(0, 6 - (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 60)); // slight recency boost
    hits.push({ item, node: n, score, matched });
  }
  return hits.sort((a, b) => b.score - a.score);
}

/** Guess which node a piece of text is about (used by the Teams/Outlook POC). */
export function detectNode(text: string, companyIds?: string[]): { node: OrgNode; confidence: number } | null {
  const t = text.toLowerCase();
  const db = getDb();
  const countryWords: Record<string, RegExp> = {
    DE: /germany|german|deutschland|gmbh|\.de\b/,
    BE: /belgium|belgian|belgi[eë]|belgique|laakdal|\.be\b/,
    NL: /netherlands|dutch|nederland|hilversum|\.nl\b/,
    FR: /france|french|\.fr\b/,
    ES: /spain|spanish|españa|\.es\b/,
    GB: /\buk\b|united kingdom|britain|\.co\.uk/,
  };
  const payrollWords = ["payroll", "cutoff", "lohn", "salary", "pay date"];
  let best: { node: OrgNode; confidence: number } | null = null;
  for (const c of db.companies) {
    if (companyIds && !companyIds.includes(c.id)) continue;
    if (!c.keywords.some((k) => t.includes(k))) continue;
    const nodes = companyNodes(c.id);
    let target = nodes.find((n) => n.type === "group")!;
    let conf = 0.55;
    const country = Object.entries(countryWords).find(([, re]) => re.test(t))?.[0];
    if (country) {
      const cn = nodes.find((n) => n.type === "country" && n.country === country);
      if (cn) { target = cn; conf = 0.8; }
      const entity = nodes.find((n) => n.parentId === cn?.id && n.name.toLowerCase().split(" ").filter((w) => w.length > 4).some((w) => t.includes(w)));
      if (entity) { target = entity; conf = 0.92; }
      else if (payrollWords.some((w) => t.includes(w))) {
        const children = nodes.filter((n) => n.parentId === cn?.id);
        if (children.length === 1) { target = children[0]; conf = 0.88; }
      }
    }
    if (!best || conf > best.confidence) best = { node: target, confidence: conf };
  }
  return best;
}

export function detectTopic(text: string): string {
  const t = text.toLowerCase();
  if (/cut-?off|deadline|input/.test(t)) return "Payroll cutoff";
  if (/calendar|pay date/.test(t)) return "Payroll calendar";
  if (/contract|agreement|msa/.test(t)) return "Contract";
  if (/onboard/.test(t)) return "Onboarding";
  if (/bonus|premium/.test(t)) return "Bonus";
  if (/contact|manager/.test(t)) return "Contacts";
  return "General";
}
