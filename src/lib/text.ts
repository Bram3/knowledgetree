/** Plain-text version of a markdown note, for one-line previews. Safe to use on the server and the client. */
export function stripMarkdown(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\|.*\|$/gm, (row) => row.replace(/\|/g, " ").replace(/-{3,}/g, ""))
    .replace(/[#>*_`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
