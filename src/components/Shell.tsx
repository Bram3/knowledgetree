"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Network, History, MessageSquare, Mail, LogOut, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { Avatar } from "./Avatar";
import { logout, resetDemo } from "@/lib/actions";

const nav = [
  { href: "/", label: "Search", icon: Search },
  { href: "/customers", label: "Customers", icon: Network },
  { href: "/activity", label: "Changes", icon: History },
];
const integrations = [
  { href: "/teams", label: "Teams", icon: MessageSquare },
  { href: "/outlook", label: "Outlook", icon: Mail },
];

export type ShellUser = { id: string; name: string; role: string; customers: number };

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <rect x="2" y="2" width="12" height="12" rx="2" fill="#006dd8" />
        <rect x="16" y="2" width="12" height="12" rx="2" fill="#f1002f" />
        <rect x="2" y="16" width="12" height="12" rx="2" fill="#ffbe00" />
        <rect x="16" y="16" width="12" height="12" rx="2" fill={light ? "#ffffff" : "#001c52"} />
      </svg>
      <span className="leading-tight">
        <span className={`font-display block text-[15px] font-semibold ${light ? "text-white" : "text-sd-text"}`}>KnowledgeTree</span>
        <span className={`block text-[10.5px] font-medium uppercase tracking-[0.12em] ${light ? "text-white/60" : "text-sd-muted"}`}>SD Worx</span>
      </span>
    </span>
  );
}

export function Shell({ children, user }: { children: React.ReactNode; user: ShellUser | null }) {
  const path = usePathname();
  const [pending, start] = useTransition();
  if (!user || path.startsWith("/login")) return <main className="min-h-screen">{children}</main>;
  const fullBleed = path.startsWith("/teams") || path.startsWith("/outlook");
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const item = (n: { href: string; label: string; icon: typeof Search }, tag?: string) => (
    <Link key={n.href} href={n.href} className={`flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-[13.5px] font-medium transition ${active(n.href) ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
      <n.icon className="h-4 w-4" /> {n.label}
      {tag && <span className="ml-auto rounded-[4px] bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">{tag}</span>}
    </Link>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-sd-dark">
        <Link href="/" className="px-5 py-5"><Wordmark light /></Link>
        <nav className="mt-2 flex flex-1 flex-col gap-0.5 px-3">
          {nav.map((n) => item(n))}
          <div className="mt-6 mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">Microsoft 365</div>
          {integrations.map((n) => item(n, "mock"))}
          <button onClick={() => start(() => resetDemo())} className="mt-auto mb-2 flex items-center gap-2 rounded-[4px] px-3 py-2 text-[12px] text-white/40 hover:bg-white/5 hover:text-white/80"><RotateCcw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} /> Reset demo data</button>
        </nav>
        <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3">
          <Avatar id={user.id} size="sm" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium text-white">{user.name}</div>
            <div className="truncate text-[11px] text-white/50">{user.role}</div>
          </div>
          <button onClick={() => start(() => logout())} title="Sign out" className="rounded-[4px] p-1.5 text-white/50 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>
      <main className={`min-w-0 flex-1 ${fullBleed ? "" : "px-8 py-7"}`}>{children}</main>
    </div>
  );
}
