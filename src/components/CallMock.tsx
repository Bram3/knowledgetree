"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, Volume2 } from "lucide-react";
import { endDemoCall } from "@/lib/leaf-actions";
import { LeafToast, type CaughtLeaves } from "./LeafToast";

/** The demo call (scene 1): Lena calls Katrin Vogel. Hanging up (or the audio ending) sends the call to KnowledgeTree. */
type Phase = "idle" | "live" | "processing" | "done" | "failed";

export function CallMock({ audioUrl, caller }: { audioUrl: string; caller: { name: string; role: string } }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [caught, setCaught] = useState<CaughtLeaves | null>(null);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const start = () => {
    setSeconds(0);
    setCaught(null);
    setPhase("live");
    audio.current!.currentTime = 0;
    audio.current!.play().catch(() => {});
  };

  /** Hang up: no click needed after this. The server transcribes the call and grows the leaves. */
  const hangUp = () => {
    if (phase !== "live") return;
    audio.current?.pause();
    setPhase("processing");
    endDemoCall()
      .then((r) => {
        setCaught(r);
        setPhase("done");
      })
      .catch(() => setPhase("failed"));
  };

  const close = useCallback(() => setCaught(null), []);
  const initials = caller.name.split(" ").map((p) => p[0]).join("");
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="flex h-screen flex-col bg-[#1f1f1f] text-white">
      <audio ref={audio} src={audioUrl} preload="auto" onEnded={hangUp} />
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-3 text-[13px] text-white/70">
        <span className="font-semibold text-white">Teams call</span>
        <span>{phase === "live" ? mmss : phase === "idle" ? "Ready" : "Call ended"}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <span className={`grid h-28 w-28 place-items-center rounded-full bg-[#5b5fc7] text-[34px] font-semibold ${phase === "live" ? "ring-4 ring-[#5b5fc7]/40 animate-pulse" : ""}`}>{initials}</span>
        <div className="text-center">
          <div className="text-[20px] font-semibold">{caller.name}</div>
          <div className="text-[13px] text-white/60">{caller.role}</div>
        </div>
        <div className="h-5 text-[13px] text-white/70">
          {phase === "live" && <span className="flex items-center gap-1.5"><Volume2 className="h-4 w-4" /> On the call · KnowledgeTree listens for working knowledge</span>}
          {phase === "processing" && <span>🍃 KnowledgeTree is reading the call…</span>}
          {phase === "done" && caught && caught.leaves.length === 0 && <span>Nothing to keep from this call.</span>}
          {phase === "failed" && <span className="text-rose-300">Could not reach KnowledgeTree. Call again to retry.</span>}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 pb-10">
        {phase === "live" ? (
          <>
            <button className="grid h-12 w-12 place-items-center rounded-full bg-white/10" aria-label="Mute"><Mic className="h-5 w-5" /></button>
            <button className="grid h-12 w-12 place-items-center rounded-full bg-white/10" aria-label="Camera"><Video className="h-5 w-5" /></button>
            <button onClick={hangUp} className="flex h-12 items-center gap-2 rounded-full bg-[#c4314b] px-5 text-[14px] font-semibold" aria-label="Hang up"><PhoneOff className="h-5 w-5" /> Hang up</button>
          </>
        ) : (
          <button onClick={start} disabled={phase === "processing"} className="flex h-12 items-center gap-2 rounded-full bg-[#5b5fc7] px-5 text-[14px] font-semibold disabled:opacity-50">
            {phase === "processing" ? <MicOff className="h-5 w-5" /> : <Phone className="h-5 w-5" />} {phase === "idle" ? `Call ${caller.name.split(" ")[0]}` : "Call again"}
          </button>
        )}
      </div>
      <LeafToast caught={caught && caught.leaves.length ? caught : null} onClose={close} />
    </div>
  );
}
