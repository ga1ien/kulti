/**
 * Shared utility functions for Kulti streaming.
 */

export function truncate(value: unknown, max_len: number = 2000): string {
  const str = typeof value === "string" ? value : String(value ?? "");
  if (str.length <= max_len) return str;
  return str.slice(0, max_len) + "... (truncated)";
}

export function short_path(filepath: string): string {
  const slash_index = filepath.lastIndexOf("/");
  if (slash_index < 0) return filepath;
  return filepath.slice(slash_index + 1);
}
