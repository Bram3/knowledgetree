import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { login } from "@/lib/actions";
import { Avatar } from "@/components/Avatar";
import { Wordmark } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const db = getDb();
  return (
    <div className="grid min-h-screen grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-between bg-sd-dark p-10 text-white">
        <Wordmark light />
        <div>
          <h1 className="max-w-md text-[34px] font-semibold leading-tight tracking-tight">One organigram per customer. Every node owns its knowledge.</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">Files, notes, contacts and experts live on the entity they belong to. Every change carries a name and a date. You only see the customers you are assigned to.</p>
        </div>
        <p className="text-[12px] text-white/40">Hackathon proof of concept · SD Worx · Unlock the Knowledge Within</p>
      </div>
      <div className="flex items-center justify-center bg-white p-10">
        <div className="w-full max-w-md">
          <h2 className="text-[20px] font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-[13.5px] text-sd-muted">Mock single sign-on. Pick an account to continue.</p>
          <ul className="mt-6 divide-y divide-sd-border rounded-[8px] border border-sd-border">
            {db.people.map((p) => (
              <li key={p.id}>
                <form action={login.bind(null, p.id)}>
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sd-subtle">
                    <Avatar id={p.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{p.name}</span>
                      <span className="block truncate text-[12px] text-sd-muted">{p.role}</span>
                    </span>
                    <span className="text-[11.5px] text-sd-muted">{p.customerIds.length} customer{p.customerIds.length === 1 ? "" : "s"}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] text-sd-muted">In production: Microsoft Entra ID, with customer assignments synced from the CRM.</p>
        </div>
      </div>
    </div>
  );
}
