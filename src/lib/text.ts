/**
 * Plain-text version of a markdown note, for one-line previews. Safe to use on the server and the client.
 * Notes are user input, so every pattern stays linear: no `\s` that can run across lines at a line start,
 * and link text/targets are bounded and single-line.
 */
export function stripMarkdown(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\|.*\|$/gm, (row) => row.replace(/\|/g, " ").replace(/-{3,}/g, ""))
    .replace(/[#>*_`~]/g, "")
    .replace(/\[([^\]\n]{1,300})\]\([^)\s]{1,1000}\)/g, "$1")
    .replace(/^[ \t]*[-+][ \t]+/gm, "")
    .replace(/^[ \t]*\d+\.[ \t]+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
