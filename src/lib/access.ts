import { requireUser, canAccess } from "./auth";
import { company, getDb, node } from "./db";
import type { Item, OrgNode, Person } from "./types";

/**
 * Access checks for server actions and routes. Every function that reads or changes
 * knowledge must call one of the `require*Access` helpers first.
 *
 * - Not signed in (or forged cookie): redirects to /login (via requireUser).
 * - Signed in but not assigned to the customer, or the target doesn't exist: throws AccessDeniedError.
 *
 * Unknown ids are treated as denied so callers can't probe which ids exist.
 */
export class AccessDeniedError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

/** Throws unless `user` is assigned to the customer that owns `nodeId`. Pure (no request scope). */
export function assertNodeAccess(user: Person, nodeId: string): OrgNode {
  const n = node(nodeId);
  if (!n || !canAccess(user, n.companyId)) throw new AccessDeniedError();
  return n;
}

/** Throws unless `user` is assigned to the customer that owns the item's node. Pure (no request scope). */
export function assertItemAccess(user: Person, itemId: string): { item: Item; node: OrgNode } {
  const item = getDb().items.find((i) => i.id === itemId);
  if (!item) throw new AccessDeniedError();
  return { item, node: assertNodeAccess(user, item.nodeId) };
}

/** Throws unless `user` is assigned to `companyId` and it exists. Pure (no request scope). */
export function assertCompanyAccess(user: Person, companyId: string) {
  const c = company(companyId);
  if (!c || !canAccess(user, c.id)) throw new AccessDeniedError();
  return c;
}

/** Signed-in user who may access the customer owning `nodeId`. */
export async function requireCustomerAccess(nodeId: string): Promise<{ user: Person; node: OrgNode }> {
  const user = await requireUser();
  return { user, node: assertNodeAccess(user, nodeId) };
}

/** Signed-in user who may access the customer owning `itemId`. */
export async function requireItemAccess(itemId: string): Promise<{ user: Person; item: Item; node: OrgNode }> {
  const user = await requireUser();
  return { user, ...assertItemAccess(user, itemId) };
}

/** Signed-in user who may access `companyId`. */
export async function requireCompanyAccess(companyId: string): Promise<{ user: Person }> {
  const user = await requireUser();
  assertCompanyAccess(user, companyId);
  return { user };
}
