import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

// Everything a "use client" module imports ends up in the browser bundle. The seed and the database
// hold every customer's notes, leaves and people (emails, customer assignments), so they must stay server-only.
const SRC = path.join(process.cwd(), "src");
const SERVER_ONLY = ["lib/seed.ts", "lib/seed-leaves.ts", "lib/db.ts"].map((f) => path.join(SRC, f));

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  return [".ts", ".tsx", "/index.ts", "/index.tsx", ""].map((ext) => base + ext).find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) ?? null;
}

/** Value imports only: `import type` and `export type` are erased and never reach the bundle. */
function valueImports(file: string): string[] {
  const src = fs.readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of src.matchAll(/^\s*(?:import|export)\s+(type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm)) {
    if (m[1]) continue;
    const r = resolve(file, m[2]);
    if (r) out.push(r);
  }
  return out;
}

const isServerActionModule = (file: string) => /^\s*["']use server["']/.test(fs.readFileSync(file, "utf8"));

/** Modules reachable from `entry` in the client bundle. Server action modules become RPC stubs, so we stop there. */
function clientGraph(entry: string): Map<string, string> {
  const seen = new Map<string, string>([[entry, entry]]);
  const queue = [entry];
  while (queue.length) {
    const f = queue.shift()!;
    for (const dep of valueImports(f)) {
      if (seen.has(dep) || isServerActionModule(dep)) continue;
      seen.set(dep, f);
      queue.push(dep);
    }
  }
  return seen;
}

describe("client bundle", () => {
  const clientEntries = sourceFiles(SRC).filter((f) => /^\s*["']use client["']/.test(fs.readFileSync(f, "utf8")));

  it("finds the client components", () => {
    expect(clientEntries.map((f) => path.relative(SRC, f))).toContain("components/NodePanel.tsx");
  });

  it.each(clientEntries.map((f) => [path.relative(SRC, f), f]))("%s does not pull the seed or the database into the browser", (_name, entry) => {
    const graph = clientGraph(entry);
    const leaked = SERVER_ONLY.filter((f) => graph.has(f)).map((f) => `${path.relative(SRC, f)} (imported by ${path.relative(SRC, graph.get(f)!)})`);
    expect(leaked).toEqual([]);
  });
});
