"use client";

import { useMemo, useCallback, useEffect } from "react";
import { ReactFlow, Background, Controls, Handle, Position, useReactFlow, type Node, type Edge, type NodeProps } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { useRouter } from "next/navigation";
import { Building2, Globe2, Landmark, Layers, Users, ArrowDownLeft, ChevronRight } from "lucide-react";
import type { OrgNode } from "@/lib/types";
import type { NodeStats } from "@/lib/db";
import type { LeafCount, SeasonCount } from "@/lib/leaves";
import { SEASON_META } from "./LeafList";
import type { Product } from "@/lib/catalog";
import { COUNTRY_NAME } from "@/lib/format";

export type ChartNodeData = { org: OrgNode; stats: NodeStats; categories: Product[]; selected: boolean; expanded: boolean; leaves: LeafCount };
export type ProductNodeData = { product: Product; count: number; customerDocs: number; selected: boolean; leaves: number; seasons?: SeasonCount; conflicts?: number };

const typeIcon = { group: Building2, country: Globe2, entity: Landmark, division: Layers, team: Users };
const typeLabel = { group: "Group", country: "Country", entity: "Legal entity", division: "Division", team: "Team" };
const W = 236, H = 150, PW = 196, PH = 56;

function OrgChartNode({ data }: NodeProps<Node<ChartNodeData>>) {
  const Icon = typeIcon[data.org.type];
  const { stats, categories } = data;
  const sub = data.org.type === "country" ? COUNTRY_NAME[data.org.country ?? ""] ?? data.org.country : `${typeLabel[data.org.type]}${data.org.country ? ` · ${data.org.country}` : ""}`;
  return (
    <div className={`w-[236px] rounded-[8px] border bg-white transition ${data.selected ? "border-sd-primary shadow-[0_0_0_3px_rgba(0,109,216,0.2)]" : data.expanded ? "border-sd-primary" : "border-sd-border hover:border-sd-primary"} ${data.leaves.conflicts ? "ring-2 ring-red-400" : ""}`}>
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-[#c4c7ca]" />
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[4px] ${data.org.type === "group" ? "bg-sd-dark text-white" : "bg-sd-subtle text-sd-dark"}`}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-tight text-sd-text">{data.org.name}</div>
          <div className="truncate text-[10.5px] font-medium uppercase tracking-[0.08em] text-sd-muted">{sub}</div>
        </div>
      </div>
      <div className="mt-2.5 grid gap-1 px-3.5 pb-3" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
        {categories.map((p) => {
          const n = stats.byCategory[p.id] ?? 0;
          return (
            <div key={p.id} title={`${p.name}: ${n} item${n === 1 ? "" : "s"}`} className="rounded-[2px] px-1 py-1 text-center" style={{ background: n ? `${p.color}1a` : "#f4f5f6" }}>
              <div className="font-mono text-[9.5px] font-semibold tracking-wide" style={{ color: n ? p.color : "#a3a5a8" }}>{p.short}</div>
              <div className="text-[11px] font-semibold" style={{ color: n ? p.color : "#c4c7ca" }}>{n}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-sd-border px-3.5 py-1.5 text-[10.5px] text-sd-muted">
        {data.leaves.total - data.leaves.seeds > 0 && <span className="inline-flex items-center gap-0.5 font-medium text-emerald-700" title="Leaves caught on this node, coloured by freshness">🍃 {data.leaves.total - data.leaves.seeds}<SeasonDots seasons={data.leaves.seasons} /></span>}
        {data.leaves.conflicts > 0 && <span className="inline-flex items-center gap-0.5 font-semibold text-red-600" title="Conflicts: a leaf contradicts a note, the owner was asked">⚠️ {data.leaves.conflicts}</span>}
        {data.leaves.seeds > 0 && <span className="inline-flex items-center gap-0.5 font-medium text-amber-700" title="Seeds: leaves waiting for a place">🌱 {data.leaves.seeds}</span>}
        {data.leaves.fallen > 0 && <span className="inline-flex items-center gap-0.5 font-medium text-stone-500" title="Fallen leaves in the archive">🍂 {data.leaves.fallen}</span>}
        {stats.customerDocs > 0 && <span className="inline-flex items-center gap-1 text-amber-700"><ArrowDownLeft className="h-3 w-3" /> {stats.customerDocs} from customer</span>}
        {stats.inherited > 0 && <span>+{stats.inherited} inherited</span>}
        <span className={`ml-auto inline-flex items-center gap-0.5 ${data.expanded ? "text-sd-primary" : ""}`}>{categories.length} categories <ChevronRight className={`h-3 w-3 transition ${data.expanded ? "rotate-90" : ""}`} /></span>
      </div>
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-[#c4c7ca]" />
    </div>
  );
}

function ProductNode({ data }: NodeProps<Node<ProductNodeData>>) {
  const p = data.product;
  return (
    <div className={`fade-up flex w-[196px] items-center gap-2.5 rounded-[8px] border bg-white px-3 py-2.5 transition ${data.selected ? "shadow-[0_0_0_3px_rgba(0,109,216,0.2)]" : "hover:shadow-sm"} ${data.conflicts ? "ring-2 ring-red-400" : ""}`} style={{ borderTopColor: data.selected ? "#006dd8" : `${p.color}66`, borderRightColor: data.selected ? "#006dd8" : `${p.color}66`, borderBottomColor: data.selected ? "#006dd8" : `${p.color}66`, borderLeftWidth: 4, borderLeftColor: p.color }}>
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-[#c4c7ca]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold text-sd-text">{p.name}</div>
        <div className="text-[10.5px] text-sd-muted">{data.count} item{data.count === 1 ? "" : "s"}{data.customerDocs ? ` · ${data.customerDocs} from customer` : ""}{data.leaves ? <span className="font-medium text-emerald-700"> · 🍃 {data.leaves}{data.seasons && <SeasonDots seasons={data.seasons} />}</span> : null}{data.conflicts ? <span className="font-semibold text-red-600" title="Conflict with a note"> · ⚠️ {data.conflicts}</span> : null}</div>
      </div>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[4px] text-[12px] font-semibold" style={{ background: data.count ? `${p.color}1a` : "#f4f5f6", color: data.count ? p.color : "#a3a5a8" }}>{data.count}</span>
    </div>
  );
}

const nodeTypes = { org: OrgChartNode, product: ProductNode };

/** Zoom onto the selected entity and its product nodes; the group (root) shows the whole tree. */
function FitOnChange({ token, ids, all }: { token: string; ids: string[]; all: boolean }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => {
      if (all) fitView({ padding: 0.15, maxZoom: 1, duration: 400 });
      else fitView({ nodes: ids.map((id) => ({ id })), padding: 0.25, maxZoom: 1.35, minZoom: 0.7, duration: 450 });
    }, 180);
    return () => clearTimeout(t);
  }, [token, ids, all, fitView]);
  return null;
}

function layout(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 18, ranksep: 56 });
  nodes.forEach((n) => g.setNode(n.id, n.type === "product" ? { width: PW, height: PH } : { width: W, height: H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => { const p = g.node(n.id); const w = n.type === "product" ? PW : W; const h = n.type === "product" ? PH : H; return { ...n, position: { x: p.x - w / 2, y: p.y - h / 2 } }; });
}

const NO_LEAVES: LeafCount = { total: 0, seeds: 0, fallen: 0, byCategory: {}, seasons: { green: 0, yellow: 0, brown: 0 }, categorySeasons: {}, conflicts: 0, categoryConflicts: {} };

/** One dot per leaf, coloured by freshness (green, yellow, brown). */
function SeasonDots({ seasons }: { seasons: SeasonCount }) {
  const dots = (["green", "yellow", "brown"] as const).flatMap((k) => Array.from({ length: Math.min(seasons[k], 6) }, () => k));
  return (
    <span className="ml-1 inline-flex items-center gap-[2px]">
      {dots.map((k, i) => <span key={i} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: SEASON_META[k].color }} title={SEASON_META[k].label} />)}
    </span>
  );
}

export function OrgChart({ companyId, nodes: orgNodes, stats, categories, selectedId, selectedCat, customerDocsByCategory, leafCounts = {} }: { companyId: string; nodes: OrgNode[]; stats: Record<string, NodeStats>; categories: Product[]; selectedId: string; selectedCat?: string; customerDocsByCategory: Record<string, Record<string, number>>; leafCounts?: Record<string, LeafCount> }) {
  const router = useRouter();
  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = orgNodes.map((o) => ({ id: o.id, type: "org", width: W, height: H, position: { x: 0, y: 0 }, data: { org: o, stats: stats[o.id] ?? { items: 0, inherited: 0, byCategory: {}, customerDocs: 0 }, categories, selected: o.id === selectedId && !selectedCat, expanded: o.id === selectedId, leaves: leafCounts[o.id] ?? NO_LEAVES } satisfies ChartNodeData }));
    const es: Edge[] = orgNodes.filter((o) => o.parentId).map((o) => ({ id: `${o.parentId}-${o.id}`, source: o.parentId!, target: o.id, type: "smoothstep" }));
    // product nodes unfold under the selected entity: the fixed categories every entity carries
    for (const p of categories) {
      const id = `${selectedId}::${p.id}`;
      ns.push({ id, type: "product", width: PW, height: PH, position: { x: 0, y: 0 }, data: { product: p, count: stats[selectedId]?.byCategory[p.id] ?? 0, customerDocs: customerDocsByCategory[selectedId]?.[p.id] ?? 0, selected: selectedCat === p.id, leaves: leafCounts[selectedId]?.byCategory[p.id] ?? 0, seasons: leafCounts[selectedId]?.categorySeasons[p.id], conflicts: leafCounts[selectedId]?.categoryConflicts[p.id] } satisfies ProductNodeData });
      es.push({ id: `${selectedId}-${id}`, source: selectedId, target: id, type: "smoothstep", style: { stroke: p.color, strokeWidth: 1.5 } });
    }
    return { nodes: layout(ns, es), edges: es };
  }, [orgNodes, stats, selectedId, selectedCat, categories, customerDocsByCategory, leafCounts]);

  const selectedOrg = orgNodes.find((o) => o.id === selectedId);
  const focusIds = useMemo(() => [selectedId, ...categories.map((p) => `${selectedId}::${p.id}`)], [selectedId, categories]);
  const isRoot = !selectedOrg?.parentId;

  const onNodeClick = useCallback((_: unknown, n: Node) => {
    if (n.type === "product") {
      const [parent, pid] = n.id.split("::");
      router.push(`/customers/${companyId}?node=${parent}&cat=${pid}`, { scroll: false });
    } else {
      router.push(`/customers/${companyId}?node=${n.id}`, { scroll: false });
    }
  }, [router, companyId]);

  return (
    <div className="relative h-full">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView fitViewOptions={{ padding: 0.15, maxZoom: 1 }} nodesDraggable={false} nodesConnectable={false} minZoom={0.3} maxZoom={1.5}>
        <FitOnChange token={`${selectedId}:${selectedCat ?? ""}`} ids={focusIds} all={isRoot} />
        <Background color="#d9dbdd" gap={20} size={1.5} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-3 rounded-[4px] border border-sd-border bg-white/95 px-3 py-2 text-[11px] text-sd-muted">
        <span className="font-semibold uppercase tracking-[0.1em]">Products</span>
        {categories.map((p) => <span key={p.id} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>)}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-[4px] border border-sd-border bg-white/95 px-2.5 py-1.5 text-[11px] text-sd-muted">Click an entity to zoom in and unfold its products · click the group or use ⛶ to see everything</div>
    </div>
  );
}
