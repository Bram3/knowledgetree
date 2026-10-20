"use client";

import { useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import { setMonthsAhead } from "@/lib/season-actions";
import { MAX_MONTHS_AHEAD, simulatedDate } from "@/lib/sim-date";

/** Demo time slider: simulate "today" up to +12 months. Freshness is recomputed everywhere on release. */
export function TimeSlider({ months }: { months: number }) {
  const [value, setValue] = useState(months);
  const [pending, start] = useTransition();
  const commit = (m: number) => {
    setValue(m);
    start(() => setMonthsAhead(m));
  };
  const date = simulatedDate(new Date(), value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className={`mt-auto mb-1 rounded-[4px] px-3 py-2 ${value ? "bg-amber-400/10" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
        <CalendarClock className="h-3.5 w-3.5" /> Simulated date
        {value > 0 && <button onClick={() => commit(0)} className="ml-auto text-[10px] normal-case tracking-normal text-amber-300 hover:text-amber-200">Back to today</button>}
      </div>
      <input
        type="range"
        min={0}
        max={MAX_MONTHS_AHEAD}
        step={1}
        value={value}
        aria-label="Simulated date, months from today"
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
        className="mt-1.5 w-full accent-amber-400"
      />
      <div className={`text-[12px] ${value ? "font-medium text-amber-200" : "text-white/60"} ${pending ? "opacity-60" : ""}`}>
        {value ? `+${value} month${value === 1 ? "" : "s"} · ${date}` : `Today · ${date}`}
      </div>
    </div>
  );
}
