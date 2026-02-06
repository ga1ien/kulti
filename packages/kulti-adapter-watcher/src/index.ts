#!/usr/bin/env node
/**
 * @kulti/adapter-watcher
 *
 * Filesystem watcher adapter for Kulti consciousness streaming.
 * Watches a directory for file changes and streams them to the state server.
 *
 * Provides consciousness streaming for agents without hook systems (Aider, etc.)
 * or as a supplement for agents with limited hooks.
 *
 * Environment:
 *   KULTI_STATE_SERVER  - State server URL (default: http://localhost:8766)
 *   KULTI_AGENT_ID      - Agent ID (default: "watcher")
 *   KULTI_API_KEY       - API key for authenticated streaming
 *   KULTI_WATCH_PATH    - Directory to watch (default: cwd)
 *   KULTI_WATCH_IGNORE  - Additional comma-separated patterns to ignore
 */

import { watch, readFile, stat } from "node:fs";
import { resolve, relative, extname, basename } from "node:path";
import {
  create_kulti_client,
  get_language,
  short_path,
  truncate,
} from "@kulti/stream-core";
import type { KultiClient } from "@kulti/stream-core";

// Default ignore patterns
const DEFAULT_IGNORE = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  ".env",
  ".DS_Store",
  ".swp",
  ".swo",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
];

function build_ignore_set(): Set<string> {
  const patterns = [...DEFAULT_IGNORE];
  const extra = process.env.KULTI_WATCH_IGNORE;
  if (extra !== undefined && extra !== "") {
    const parts = extra.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
    patterns.push(...parts);
  }
  return new Set(patterns);
}

function should_ignore(file_path: string, ignore_set: Set<string>): boolean {
  const parts = file_path.split("/");
  for (const part of parts) {
    if (ignore_set.has(part)) return true;
    // Check .env* pattern
    if (part.startsWith(".env")) return true;
  }
  // Ignore binary/image extensions
  const ext = extname(file_path).toLowerCase();
  const binary_extensions = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
    ".woff", ".woff2", ".ttf", ".eot",
    ".zip", ".tar", ".gz", ".br",
    ".mp3", ".mp4", ".wav", ".webm",
    ".pdf", ".doc", ".xls",
  ]);
  if (binary_extensions.has(ext)) return true;
  return false;
}

function read_file_content(path: string): Promise<string | null> {
  return new Promise((resolve_promise) => {
    stat(path, (stat_err, stats) => {
      if (stat_err !== null) {
        resolve_promise(null);
        return;
      }
      // Skip files larger than 100KB
      if (stats.size > 100_000) {
        resolve_promise(null);
        return;
      }
      if (!stats.isFile()) {
        resolve_promise(null);
        return;
      }
      readFile(path, "utf-8", (read_err, data) => {
        if (read_err !== null) {
          resolve_promise(null);
          return;
        }
        resolve_promise(data);
      });
    });
  });
}

function start_watcher(): void {
  const state_server_url =
    process.env.KULTI_STATE_SERVER !== undefined && process.env.KULTI_STATE_SERVER !== ""
      ? process.env.KULTI_STATE_SERVER
      : "http://localhost:8766";
  const agent_id =
    process.env.KULTI_AGENT_ID !== undefined && process.env.KULTI_AGENT_ID !== ""
      ? process.env.KULTI_AGENT_ID
      : "watcher";
  const api_key = process.env.KULTI_API_KEY !== undefined ? process.env.KULTI_API_KEY : "";
  const watch_path =
    process.env.KULTI_WATCH_PATH !== undefined && process.env.KULTI_WATCH_PATH !== ""
      ? resolve(process.env.KULTI_WATCH_PATH)
      : process.cwd();

  const ignore_set = build_ignore_set();

  const client: KultiClient = create_kulti_client({
    state_server_url,
    agent_id,
    api_key,
  });

  // Send initial goal
  client.goal({ title: "Watching filesystem for changes" });

  // Debounce map: filepath -> timeout
  const debounce_map = new Map<string, NodeJS.Timeout>();
  const DEBOUNCE_MS = 500;

  process.stderr.write(`[kulti-watcher] Watching ${watch_path}\n`);
  process.stderr.write(`[kulti-watcher] Streaming to ${state_server_url} as ${agent_id}\n`);

  try {
    const watcher = watch(watch_path, { recursive: true });

    watcher.on("change", (event_type: string, filename: string | null) => {
      if (filename === null) return;

      const relative_path = filename;
      if (should_ignore(relative_path, ignore_set)) return;

      // Debounce per file
      const existing_timeout = debounce_map.get(relative_path);
      if (existing_timeout !== undefined) {
        clearTimeout(existing_timeout);
      }

      const timeout = setTimeout(() => {
        debounce_map.delete(relative_path);
        handle_file_change(client, watch_path, relative_path, event_type);
      }, DEBOUNCE_MS);

      debounce_map.set(relative_path, timeout);
    });

    watcher.on("error", (err: Error) => {
      process.stderr.write(`[kulti-watcher] Watch error: ${err.message}\n`);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    process.stderr.write(`[kulti-watcher] Failed to start: ${message}\n`);
    process.exit(1);
  }
}

async function handle_file_change(
  client: KultiClient,
  base_path: string,
  relative_path: string,
  event_type: string,
): Promise<void> {
  const full_path = resolve(base_path, relative_path);
  const fname = short_path(relative_path);
  const lang = get_language(basename(relative_path));

  if (event_type === "rename") {
    // Could be create or delete — check if file exists
    const content = await read_file_content(full_path);
    if (content === null) {
      // File was deleted
      client.thought({
        type: "observation",
        content: `File deleted: ${fname}`,
        priority: "detail",
      });
      return;
    }
    // File was created
    client.thought({
      type: "observation",
      content: `File created: ${fname}`,
      priority: "detail",
    });
    client.code({
      filename: fname,
      language: lang,
      content: truncate(content, 5000),
      action: "write",
    });
    return;
  }

  // File was modified
  const content = await read_file_content(full_path);
  if (content === null) return;

  client.thought({
    type: "observation",
    content: `File changed: ${fname}`,
    priority: "detail",
  });
  client.code({
    filename: fname,
    language: lang,
    content: truncate(content, 5000),
    action: "write",
  });
}

start_watcher();
