"use client";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addNode } from "@/lib/actions";
import { useRouter } from "next/navigation";

export function AddNodeButton({ companyId, nodes }: { companyId: string; nodes: { id: string; name: string; type: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-[13px]"><Plus className="h-4 w-4" /> Add node</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} className="fade-up w-[420px] rounded-2xl bg-white p-6 shadow-2xl" action={(fd) => start(async () => {
            const id = await addNode({ companyId, parentId: String(fd.get("parent")), name: String(fd.get("name")), type: fd.get("type") as "country" | "entity" | "division" | "team", country: String(fd.get("country") || "") || undefined });
            setOpen(false);
            router.push(`/customers/${companyId}?node=${id}`);
          })}>
            <div className="flex items-center justify-between"><h3 className="text-[16px] font-semibold">Add a node</h3><button type="button" onClick={() => setOpen(false)}><X className="h-4 w-4 text-slate-400" /></button></div>
            <label className="mt-4 block text-[12px] font-medium text-slate-600">Name<input name="name" required placeholder="e.g. Warehouse Antwerp" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px] outline-none focus:border-sd-navy" /></label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-[12px] font-medium text-slate-600">Type<select name="type" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px]"><option value="division">Division</option><option value="entity">Legal entity</option><option value="team">Team</option><option value="country">Country</option></select></label>
              <label className="block text-[12px] font-medium text-slate-600">Country<select name="country" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px]"><option value="">Inherit</option><option>BE</option><option>DE</option><option>NL</option><option>FR</option><option>ES</option><option>GB</option></select></label>
            </div>
            <label className="mt-3 block text-[12px] font-medium text-slate-600">Under<select name="parent" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px]">{nodes.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.type})</option>)}</select></label>
            <button disabled={pending} className="btn-primary mt-5 w-full py-2 text-[13.5px] disabled:opacity-50">{pending ? "Adding…" : "Add to organigram"}</button>
          </form>
        </div>
      )}
    </>
  );
}
