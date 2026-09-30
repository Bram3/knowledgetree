import { redirect } from "next/navigation";
export default async function SearchRedirect({ searchParams }: PageProps<"/search">) {
  const sp = (await searchParams) as Record<string, string | undefined>;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) p.set(k, v);
  redirect(`/?${p.toString()}`);
}
