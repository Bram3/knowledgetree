export type Person = {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string; // tailwind bg class
  email: string;
  customerIds: string[]; // customers this person may access
  leftAt?: string; // left the team or changed role: their knowledge needs a new owner (handover)
};

export type Company = {
  id: string;
  name: string;
  industry: string;
  accent: string; // hex, used for the generated monogram logo
  accountLeadId: string;
  since: string;
  products: string[]; // fixed categories for every node of this customer (ids from catalog)
  keywords: string[]; // for node detection in chats and emails
  logoUrl?: string;
};

export type NodeType = "group" | "country" | "entity" | "division" | "team";

export type OrgNode = {
  id: string;
  companyId: string;
  parentId: string | null;
  name: string;
  type: NodeType;
  country?: string; // ISO code
  expertIds: string[];
  contacts?: { name: string; role: string; email: string }[];
};

export type ItemKind = "file" | "note";

export type Version = {
  version: number;
  byId: string;
  at: string;
  note: string;
  source?: LeafSource & { leafId: string }; // the call/mail that corrected the note (conflict resolved with "Correct")
};

export type Item = {
  id: string;
  nodeId: string;
  kind: ItemKind;
  title: string;
  content: string; // note body or file summary
  fileName?: string;
  fileSize?: string;
  fileUrl?: string; // original document
  previewUrl?: string; // PDF preview when the original is not viewable inline
  topic: string;
  category: string; // product id from the catalog, or "other"
  origin: "sdworx" | "customer"; // created by SDWorx, or received from the customer
  scope: string[]; // country codes or ["all"]
  ownerId: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  versions: Version[];
  status: "active" | "superseded";
  supersededById?: string;
  confirmsId?: string; // this item corroborates another item
  reconfirmedBy?: LeafSource[]; // calls/mails/messages that said the same as this note (COMPARE "same"), no leaf made
  source: { type: "portal" | "teams" | "outlook"; ref: string };
};

export type ActivityAction =
  | "created"
  | "updated"
  | "verified"
  | "superseded"
  | "new_version"
  | "node_added"
  | "captured_teams"
  | "captured_outlook"
  | "leaf_conflict"
  | "leaf_reconfirmed"
  | "leaf_kept"
  | "leaf_deferred"
  | "handed_over";

export type Activity = {
  id: string;
  at: string;
  actorId: string;
  action: ActivityAction;
  companyId: string;
  nodeId: string;
  itemId?: string;
  leafId?: string; // the new leaf this entry is about (e.g. leaf_conflict), so undoing the leaf removes it too
  summary: string;
};

// ---------- leaves ----------

export type LeafType = "attention" | "change" | "decision" | "promise" | "expertise" | "risk";
export const LEAF_TYPES: readonly LeafType[] = ["attention", "change", "decision", "promise", "expertise", "risk"];

/** Where a leaf was captured. One ingest entry point serves all of them. */
export type Channel = "call" | "mail" | "browser" | "teams" | "voice";
/** auto = passive capture (0 clicks), reaction = a 🍃 from the user, voice = a spoken note. */
export type Trigger = "auto" | "reaction" | "voice";

/** seed = placement unsure, waits at the customer root. auto = placed by the pipeline. */
export type LeafStatus = "seed" | "auto" | "verified" | "conflict" | "fallen" | "promoted";

export type LeafSource = {
  channel: Channel;
  trigger: Trigger;
  ref: string; // channel-specific id of the message/call, e.g. "outlook:e1"
  at: string; // ISO time of capture
  byId: string; // person who captured it (the signed-in user)
  from?: string; // who said it, e.g. "Katrin Vogel <katrin.vogel@nike.com>"
};

/** An atomic piece of working knowledge caught from daily communication, hung on a node › category. */
export type Leaf = {
  id: string;
  nodeId: string; // for a seed: the customer's root node
  category: string; // product id from the catalog, or "other"
  type: LeafType;
  statement: string;
  why?: string;
  quote: string; // literal quote from the source text
  people: string[];
  source: LeafSource;
  confidence: number; // 0..1
  status: LeafStatus;
  reconfirmedAt: string[]; // ×n label = length + 1
  usefulCount: number;
  conflictsWith?: string; // id of the note (Item), or of the leaf (second thought, #19), this leaf contradicts
  doubtedAt?: string; // a draft's claim against this leaf was said to be correct: brown (in doubt) until the owner answers
  conflictClaims?: { said: string; noted: string }; // short claims for the owner's card: "Katrin said the 20th, your note says the 15th"
  deferredAt?: string; // the owner tapped "Not sure": the conflict waits in the digest, no card
  reconfirmedBy?: LeafSource[]; // the sources behind reconfirmedAt (same order), so re-ingesting one is idempotent
  promotedToItemId?: string;
  verifiedById?: string;
  ownerId?: string; // set by a handover; without it the owner is source.byId
};

/** Ownership of a leaver's leaves and items on one customer moved to a successor. */
export type Handover = {
  id: string;
  companyId: string;
  fromId: string;
  toId: string;
  byId: string;
  at: string;
  leafIds: string[];
  itemIds: string[];
};

export type Db = {
  people: Person[];
  companies: Company[];
  nodes: OrgNode[];
  items: Item[];
  activity: Activity[];
  leaves: Leaf[];
  handovers: Handover[];
};
