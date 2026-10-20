import { SEED_FILES_DIR, serveKnowledgeFile } from "@/lib/files";

/** Seeded demo documents, served with the same customer access check as uploads. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return serveKnowledgeFile(SEED_FILES_DIR, name, `/files/${name}`);
}
