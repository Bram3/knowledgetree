export type Person = {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string; // tailwind bg class
  email: string;
  customerIds: string[]; // customers this person may access
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
  | "captured_outlook";

export type Activity = {
  id: string;
  at: string;
  actorId: string;
  action: ActivityAction;
  companyId: string;
  nodeId: string;
  itemId?: string;
  summary: string;
};

export type Db = {
  people: Person[];
  companies: Company[];
  nodes: OrgNode[];
  items: Item[];
  activity: Activity[];
};
