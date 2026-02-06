/**
 * Language detection from file extensions.
 * Single source of truth — previously duplicated across 5 files.
 */

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  sql: "sql",
  css: "css",
  html: "html",
  json: "json",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  rs: "rust",
  go: "go",
  rb: "ruby",
  java: "java",
  swift: "swift",
  kt: "kotlin",
  c: "c",
  cpp: "cpp",
  h: "c",
  toml: "toml",
  xml: "xml",
  svg: "xml",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
};

export function get_language(filename: string): string {
  const dot_index = filename.lastIndexOf(".");
  if (dot_index < 0) return "text";
  const ext = filename.slice(dot_index + 1).toLowerCase();
  return LANG_MAP[ext] ?? "text";
}
