import { serveKnowledgeFile } from "@/lib/files";
import { uploadsDir } from "@/lib/uploads";

export async function GET(_req: Request, { params }: RouteContext<"/api/files/[name]">) {
  const { name } = await params;
  return serveKnowledgeFile(uploadsDir(), name, `/api/files/${name}`);
}
