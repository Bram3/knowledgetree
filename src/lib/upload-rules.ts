/** Upload rules shared by server (validation) and client (file picker). No Node imports here. */

/** Size limit per file. Keep next.config serverActions.bodySizeLimit above this. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Allowed extensions and the Content-Type they are served with. SVG/HTML/JS are deliberately absent. */
export const ALLOWED_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/** Value for <input type="file" accept>. */
export const UPLOAD_ACCEPT = Object.keys(ALLOWED_TYPES).map((e) => `.${e}`).join(",");
