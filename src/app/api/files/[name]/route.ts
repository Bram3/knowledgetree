import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

const DIR = path.join(process.cwd(), "data", "uploads");
const TYPES: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", txt: "text/plain; charset=utf-8", md: "text/markdown; charset=utf-8", csv: "text/csv", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };

export async function GET(_req: Request, { params }: RouteContext<"/api/files/[name]">) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { name } = await params;
  const safe = path.basename(name);
  const file = path.join(DIR, safe);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const ext = safe.split(".").pop()?.toLowerCase() ?? "";
  const original = safe.replace(/^[a-z0-9]+-/, "");
  return new Response(fs.readFileSync(file), { headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Content-Disposition": `inline; filename="${original}"` } });
}
