"use client";

import { useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { markLeafUseful } from "@/lib/season-actions";

/** "Useful" on a leaf: implicit verification by use, slows its fading. The page refreshes via revalidatePath. */
export function UsefulButton({ leafId, count }: { leafId: string; count: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => void (await markLeafUseful(leafId)))}
      disabled={pending}
      title="Useful: using a leaf verifies it and slows its fading"
      className="inline-flex items-center gap-1 rounded-[4px] border border-sd-border px-1.5 py-0.5 text-[10.5px] font-medium text-sd-muted hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
    >
      <ThumbsUp className="h-3 w-3" /> Useful{count ? ` · ${count}` : ""}
    </button>
  );
}
