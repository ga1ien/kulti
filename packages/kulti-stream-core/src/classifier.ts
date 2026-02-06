/**
 * Tool classification engine.
 *
 * Normalizes agent-specific tool names to canonical forms and produces
 * structured KultiPayload fragments for before/after tool events.
 *
 * Supported agents:
 *   - Claude Code: Bash, Write, Edit, Read, Grep, Glob, Task, WebFetch, WebSearch
 *   - OpenClaw:    exec, write_file, edit_file, read_file, search, grep, glob, browser, web_fetch, web_search
 *   - Gemini CLI:  shell, write, read, search (mapped via normalize_tool_name)
 *   - Codex CLI:   shell, create_file, apply_diff, read_file
 */

import type { KultiPayload, NormalizedToolEvent } from "./types";
import { get_language } from "./language";
import { short_path, truncate } from "./helpers";

// ── Canonical tool name mapping ────────────────────────────────────────

type CanonicalTool =
  | "exec"
  | "write_file"
  | "edit_file"
  | "read_file"
  | "search"
  | "browser"
  | "web_fetch"
  | "web_search"
  | "memory"
  | "delegate"
  | "unknown";

const TOOL_NAME_MAP: Record<string, CanonicalTool> = {
  // Claude Code
  bash: "exec",
  write: "write_file",
  edit: "edit_file",
  read: "read_file",
  grep: "search",
  glob: "search",
  task: "delegate",
  webfetch: "web_fetch",
  websearch: "web_search",
  // OpenClaw
  exec: "exec",
  write_file: "write_file",
  edit_file: "edit_file",
  read_file: "read_file",
  search: "search",
  browser: "browser",
  web_fetch: "web_fetch",
  web_search: "web_search",
  memory_search: "memory",
  memory_get: "memory",
  // Codex CLI
  shell: "exec",
  create_file: "write_file",
  apply_diff: "edit_file",
  // Gemini CLI
  update_files: "write_file",
};

export function normalize_tool_name(raw: string): CanonicalTool {
  return TOOL_NAME_MAP[raw.toLowerCase()] ?? "unknown";
}

// ── Before-tool classification ─────────────────────────────────────────

export function classify_before_tool(
  event: NormalizedToolEvent,
): Partial<KultiPayload> {
  const canonical = normalize_tool_name(event.tool_name);
  const params = event.params;
  const meta: Record<string, unknown> = { tool: event.tool_name };

  let thought: KultiPayload["thought"];

  switch (canonical) {
    case "exec": {
      const cmd = str_param(params, "command");
      const desc = str_param(params, "description");
      const label = desc ? desc : cmd.slice(0, 120) || "running command";
      meta.command = cmd.slice(0, 200);
      thought = { type: "tool", content: `Running: ${label}`, metadata: meta };
      break;
    }

    case "write_file": {
      const path = resolve_path(params);
      meta.file = path;
      thought = {
        type: "decision",
        content: `Writing: ${short_path(path)}`,
        metadata: meta,
      };
      break;
    }

    case "edit_file": {
      const path = resolve_path(params);
      meta.file = path;
      thought = {
        type: "decision",
        content: `Editing: ${short_path(path)}`,
        metadata: meta,
      };
      break;
    }

    case "read_file": {
      const path = resolve_path(params);
      meta.file = path;
      thought = {
        type: "observation",
        content: `Reading: ${short_path(path)}`,
        metadata: meta,
      };
      break;
    }

    case "search": {
      const pattern =
        str_param(params, "pattern") || str_param(params, "query");
      meta.pattern = pattern;
      thought = {
        type: "observation",
        content: `Searching: ${pattern}`,
        metadata: meta,
      };
      break;
    }

    case "browser": {
      const action = str_param(params, "action") || "browse";
      const target = str_param(params, "targetUrl") || str_param(params, "url");
      thought = {
        type: "context",
        content: `Browser: ${action}${target ? ` ${target}` : ""}`,
        metadata: meta,
      };
      break;
    }

    case "web_fetch": {
      const url = str_param(params, "url");
      thought = {
        type: "context",
        content: `Fetching: ${url}`,
        metadata: meta,
      };
      break;
    }

    case "web_search": {
      const query = str_param(params, "query");
      thought = {
        type: "context",
        content: `Searching web: ${query}`,
        metadata: meta,
      };
      break;
    }

    case "memory": {
      const query = str_param(params, "query");
      thought = {
        type: "context",
        content: `Recalling: ${query}`,
        metadata: meta,
      };
      break;
    }

    case "delegate": {
      const desc =
        str_param(params, "description") || str_param(params, "prompt");
      thought = {
        type: "reasoning",
        content: `Delegating: ${desc.slice(0, 200)}`,
        metadata: meta,
      };
      break;
    }

    default: {
      thought = {
        type: "tool",
        content: `Using: ${event.tool_name}`,
        metadata: meta,
      };
      break;
    }
  }

  return { thought, status: "working" };
}

// ── After-tool classification ──────────────────────────────────────────

export function classify_after_tool(
  event: NormalizedToolEvent,
): Partial<KultiPayload> | null {
  const canonical = normalize_tool_name(event.tool_name);
  const params = event.params;

  switch (canonical) {
    case "write_file": {
      const path = resolve_path(params);
      const fname = short_path(path);
      const content = str_param(params, "content");
      return {
        code: {
          filename: fname,
          language: get_language(fname),
          content: truncate(content, 5000),
          action: "write",
        },
        stats: { files: 1 },
      };
    }

    case "edit_file": {
      const path = resolve_path(params);
      const fname = short_path(path);
      const old_str = str_param(params, "old_string");
      const new_str = str_param(params, "new_string");

      let diff = `--- ${fname}\n`;
      for (const line of old_str.split("\n")) {
        diff += `- ${line}\n`;
      }
      for (const line of new_str.split("\n")) {
        diff += `+ ${line}\n`;
      }

      return {
        code: {
          filename: fname,
          language: get_language(fname),
          content: truncate(diff, 5000),
          action: "edit",
        },
        stats: { files: 1 },
      };
    }

    case "exec": {
      const cmd = str_param(params, "command");
      const output = truncate(event.result, 1500);

      const lines: Array<{ type: string; content: string }> = [
        { type: "input", content: `$ ${cmd}` },
      ];
      if (output.trim()) {
        lines.push({ type: "output", content: output });
      }

      return {
        terminal: lines,
        terminal_append: true,
        stats: { commands: 1 },
      };
    }

    default:
      return null;
  }
}

// ── Internal helpers ───────────────────────────────────────────────────

function str_param(params: Record<string, unknown>, key: string): string {
  const val = params[key];
  return typeof val === "string" ? val : "";
}

function resolve_path(params: Record<string, unknown>): string {
  return (
    str_param(params, "file_path") ||
    str_param(params, "path") ||
    str_param(params, "filename") ||
    "unknown"
  );
}
