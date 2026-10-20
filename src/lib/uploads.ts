import fs from "fs";
import path from "path";
import { dataDir, uid } from "./db";

import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from "./upload-rules";

export { ALLOWED_TYPES, MAX_UPLOAD_BYTES };

const PREVIEWABLE = new Set(["pdf", "png", "jpg", "jpeg", "gif"]);

export class UploadRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadRejectedError";
  }
}

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Throws UploadRejectedError for disallowed types or oversized files. */
export function validateUpload(file: File) {
  if (!ALLOWED_TYPES[extensionOf(file.name)]) throw new UploadRejectedError(`File type not allowed: ${file.name}. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadRejectedError(`File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`);
}

export function uploadsDir() {
  return path.join(dataDir(), "uploads");
}

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Validates and writes the file to the uploads dir. Returns the fields to store on the item. */
export async function storeUpload(file: File): Promise<{ fileName: string; fileUrl: string; previewUrl?: string; fileSize: string }> {
  validateUpload(file);
  const stored = `${uid("f")}-${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  fs.mkdirSync(uploadsDir(), { recursive: true });
  fs.writeFileSync(path.join(uploadsDir(), stored), Buffer.from(await file.arrayBuffer()));
  const fileUrl = `/api/files/${stored}`;
  return { fileName: file.name, fileUrl, previewUrl: PREVIEWABLE.has(extensionOf(file.name)) ? fileUrl : undefined, fileSize: formatSize(file.size) };
}
