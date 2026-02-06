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

import type {
  KultiPayload,
  KultiDiff,
  KultiDiffHunk,
  NormalizedToolEvent,
  ThoughtPriority,
} from "./types";
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

// ── Priority assignment ─────────────────────────────────────────────────

/** Assign visual priority based on canonical tool type */
function get_priority(canonical: CanonicalTool, phase: "before" | "after"): ThoughtPriority {
  if (phase === "after") return "detail";

  switch (canonical) {
    case "delegate":
      return "headline";
    case "exec":
    case "write_file":
    case "edit_file":
      return "working";
    case "read_file":
    case "search":
    case "memory":
      return "detail";
    default:
      return "working";
  }
}

// ── Before-tool classification ─────────────────────────────────────────

export function classify_before_tool(
  event: NormalizedToolEvent,
): Partial<KultiPayload> {
  const canonical = normalize_tool_name(event.tool_name);
  const params = event.params;
  const meta: Record<string, unknown> = { tool: event.tool_name };
  const priority = get_priority(canonical, "before");

  let thought: KultiPayload["thought"];

  switch (canonical) {
    case "exec": {
      const cmd = str_param(params, "command");
      const desc = str_param(params, "description");
      const label = desc ? desc : cmd.slice(0, 120) || "running command";
      meta.command = cmd.slice(0, 200);
      thought = { type: "tool", content: `Running: ${label}`, priority, metadata: meta };
      break;
    }

    case "write_file": {
      const path = resolve_path(params);
      meta.file = path;
      thought = {
        type: "decision",
        content: `Writing: ${short_path(path)}`,
        priority,
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
        priority,
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
        priority,
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
        priority,
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
        priority,
        metadata: meta,
      };
      break;
    }

    case "web_fetch": {
      const url = str_param(params, "url");
      thought = {
        type: "context",
        content: `Fetching: ${url}`,
        priority,
        metadata: meta,
      };
      break;
    }

    case "web_search": {
      const query = str_param(params, "query");
      thought = {
        type: "context",
        content: `Searching web: ${query}`,
        priority,
        metadata: meta,
      };
      break;
    }

    case "memory": {
      const query = str_param(params, "query");
      thought = {
        type: "context",
        content: `Recalling: ${query}`,
        priority,
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
        priority,
        metadata: meta,
      };
      break;
    }

    default: {
      thought = {
        type: "tool",
        content: `Using: ${event.tool_name}`,
        priority,
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

  // Check for tool errors
  const error_payload = detect_error(event);

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
        ...(error_payload !== null ? { error: error_payload } : {}),
      };
    }

    case "edit_file": {
      const path = resolve_path(params);
      const fname = short_path(path);
      const old_str = str_param(params, "old_string");
      const new_str = str_param(params, "new_string");

      // Build structured diff
      const hunk: KultiDiffHunk = {
        start: 0,
        removed: old_str.split("\n"),
        added: new_str.split("\n"),
      };
      const diff: KultiDiff = {
        filename: fname,
        language: get_language(fname),
        hunks: [hunk],
      };

      // Also keep legacy code field for backward compat
      let legacy_diff = `--- ${fname}\n`;
      for (const line of old_str.split("\n")) {
        legacy_diff += `- ${line}\n`;
      }
      for (const line of new_str.split("\n")) {
        legacy_diff += `+ ${line}\n`;
      }

      return {
        code: {
          filename: fname,
          language: get_language(fname),
          content: truncate(legacy_diff, 5000),
          action: "edit",
        },
        diff,
        stats: { files: 1 },
        ...(error_payload !== null ? { error: error_payload } : {}),
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
        ...(error_payload !== null ? { error: error_payload } : {}),
      };
    }

    default:
      if (error_payload !== null) {
        return { error: error_payload };
      }
      return null;
  }
}

// ── Error detection ────────────────────────────────────────────────────

function detect_error(event: NormalizedToolEvent): KultiPayload["error"] | null {
  if (event.result === undefined || event.result === null) return null;

  const result_str = typeof event.result === "string"
    ? event.result
    : JSON.stringify(event.result);

  // Detect common error patterns
  const error_patterns = [
    /error:/i,
    /Error: /,
    /ENOENT/,
    /EACCES/,
    /failed/i,
    /exit code [1-9]/i,
    /command not found/i,
    /compilation failed/i,
    /type error/i,
    /syntax error/i,
  ];

  const has_error = error_patterns.some(p => p.test(result_str));
  if (!has_error) return null;

  // Extract meaningful error message
  const lines = result_str.split("\n");
  const error_line = lines.find(l =>
    /error|Error|ENOENT|EACCES|failed|exit code/i.test(l),
  );

  const file = resolve_path(event.params);
  return {
    message: truncate(error_line ?? lines[0] ?? "Unknown error", 500),
    file: file !== "unknown" ? file : undefined,
    stack: truncate(result_str, 2000),
  };
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
