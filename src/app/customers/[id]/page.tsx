import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { requireUser, canAccess } from "@/lib/auth";
import { company, companyNodes, companySummary, nodeStats, inheritedItems, itemsForNode, nodePath, node as getNode, nodeCountry, recentActivity, getDb, person, companyCategories } from "@/lib/db";
import { OrgChart } from "@/components/OrgChart";
import { NodePanel, type PanelData } from "@/components/NodePanel";
import { AddNodeButton } from "@/components/AddNodeButton";
import { CompanyLogo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params, searchParams }: PageProps<"/customers/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = (await searchParams) as { node?: string; item?: string; cat?: string };
  const c = company(id);
  if (!c) notFound();
  if (!canAccess(user, id)) {
    return (
      <div className="mx-auto mt-24 max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-[8px] bg-sd-subtle text-sd-muted"><Lock className="h-6 w-6" /></span>
        <h1 className="mt-4 text-[20px] font-semibold">No access to {c.name}</h1>
        <p className="mt-2 text-[14px] text-sd-muted">You are not assigned to this customer. Ask the account lead, {person(c.accountLeadId)?.name}, to add you.</p>
        <Link href="/customers" className="mt-5 inline-block text-[13.5px] font-medium text-sd-primary hover:underline">Back to my customers</Link>
      </div>
    );
  }
  const nodes = companyNodes(id);
  const stats = Object.fromEntries(nodes.map((n) => [n.id, nodeStats(n.id)]));
  const selectedId = sp.node && nodes.some((n) => n.id === sp.node) ? sp.node : nodes.find((n) => n.type === "group")!.id;
  const selected = getNode(selectedId)!;
  const summary = companySummary(id);
  const categories = companyCategories(id);
  const selectedCat = sp.cat && categories.some((c) => c.id === sp.cat) ? sp.cat : undefined;
  const db = getDb();
  const customerDocsByCategory = Object.fromEntries(nodes.map((n) => [n.id, Object.fromEntries(categories.map((c) => [c.id, itemsForNode(n.id).filter((i) => i.status === "active" && i.category === c.id && i.origin === "customer").length]))]));

  const panel: PanelData = {
    node: selected,
    path: nodePath(selectedId).map((p) => ({ id: p.id, name: p.name })),
    viewCountry: nodeCountry(selectedId),
    categories,
    items: itemsForNode(selectedId),
    inherited: inheritedItems(selectedId).map(({ item, from }) => ({ ...item, inheritedFrom: from.name })),
    experts: [...new Set([...selected.expertIds, ...nodePath(selectedId).flatMap((p) => p.expertIds)])].map((e) => person(e)!).filter(Boolean),
    activity: recentActivity(200, { companyId: id }).filter((a) => a.nodeId === selectedId || db.items.find((i) => i.id === a.itemId)?.nodeId === selectedId).slice(0, 30),
    highlightItem: sp.item,
    currentUserId: user.id,
    initialCategory: selectedCat,
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col gap-4">
      <header className="flex items-center gap-4">
        <CompanyLogo name={c.name} accent={c.accent} logoUrl={c.logoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[12px] text-sd-muted"><Link href="/customers" className="hover:text-sd-primary">Customers</Link><ChevronRight className="h-3 w-3" /><span>{c.name}</span></div>
          <h1 className="text-[22px] font-semibold tracking-tight">{c.name}</h1>
        </div>
        <div className="flex items-center gap-5 text-[12.5px] text-sd-muted">
          <span><b className="text-sd-text">{summary.nodes}</b> entities × <b className="text-sd-text">{categories.length}</b> products</span>
          <span><b className="text-sd-text">{summary.items}</b> items</span>
          <span>Account lead <b className="text-sd-text">{person(c.accountLeadId)?.name}</b></span>
        </div>
        <AddNodeButton companyId={id} nodes={nodes.map((n) => ({ id: n.id, name: n.name, type: n.type }))} />
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_440px] gap-4">
        <div className="card relative min-h-0 overflow-hidden">
          <OrgChart companyId={id} nodes={nodes} stats={stats} categories={categories} selectedId={selectedId} selectedCat={selectedCat} customerDocsByCategory={customerDocsByCategory} />
        </div>
        <NodePanel data={panel} key={`${selectedId}:${selectedCat ?? "all"}`} />
      </div>
    </div>
  );
}
