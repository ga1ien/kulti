#!/usr/bin/env node
/**
 * @kulti/adapter-claude
 *
 * Claude Code hook adapter. Reads JSON from stdin, classifies the tool event
 * using @kulti/stream-core, and POSTs to the Kulti state server.
 *
 * Replaces scripts/kulti-stream-hook.sh — eliminates the Python dependency.
 *
 * Registered in .claude/settings.json:
 *   "command": "node packages/kulti-adapter-claude/dist/index.js"
 *
 * Environment:
 *   KULTI_STREAM_ENABLED - "0" to disable (default: enabled)
 *   KULTI_STATE_SERVER   - State server URL (default: http://localhost:8766)
 *   KULTI_AGENT_ID       - Agent ID (default: "nex")
 *   CLAUDE_HOOK_EVENT_NAME - Set by Claude Code (PreToolUse, PostToolUse, etc.)
 */

import {
  create_kulti_client,
  classify_before_tool,
  classify_after_tool,
  truncate,
} from "@kulti/stream-core";
import type { NormalizedToolEvent, KultiPayload } from "@kulti/stream-core";

async function main(): Promise<void> {
  if (process.env.KULTI_STREAM_ENABLED === "0") {
    process.exit(0);
  }

  const state_server_url =
    process.env.KULTI_STATE_SERVER ?? "http://localhost:8766";
  const agent_id = process.env.KULTI_AGENT_ID ?? "nex";
  const hook_name = process.env.CLAUDE_HOOK_EVENT_NAME ?? "unknown";

  // Read JSON from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) process.exit(0);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const client = create_kulti_client({ state_server_url, agent_id });

  const tool_name = typeof data.tool_name === "string" ? data.tool_name : "";
  let tool_input = data.tool_input ?? {};
  if (typeof tool_input === "string") {
    try {
      tool_input = JSON.parse(tool_input);
    } catch {
      tool_input = {};
    }
  }
  const tool_response = data.tool_response;

  let payload: Partial<KultiPayload> | null = null;

  if (hook_name === "PreToolUse") {
    const event: NormalizedToolEvent = {
      tool_name,
      phase: "before",
      params: tool_input as Record<string, unknown>,
    };
    payload = classify_before_tool(event);
  } else if (hook_name === "PostToolUse") {
    const event: NormalizedToolEvent = {
      tool_name,
      phase: "after",
      params: tool_input as Record<string, unknown>,
      result: tool_response,
    };
    payload = classify_after_tool(event);
  } else if (hook_name === "UserPromptSubmit") {
    const msg = extract_message(data);
    payload = {
      thought: {
        type: "prompt",
        content: `User: ${truncate(msg, 500)}`,
        metadata: {},
      },
      status: "working",
    };
  } else if (hook_name === "Stop") {
    payload = {
      thought: {
        type: "evaluation",
        content: "Turn complete",
        metadata: {},
      },
      status: "thinking",
    };
  } else if (hook_name === "SubagentStart") {
    const name =
      typeof data.agent_name === "string"
        ? data.agent_name
        : typeof data.subagent_type === "string"
          ? data.subagent_type
          : "subagent";
    payload = {
      thought: {
        type: "reasoning",
        content: `Subagent started: ${name}`,
        metadata: { tool: "subagent" },
      },
    };
  } else if (hook_name === "SubagentStop") {
    const name =
      typeof data.agent_name === "string"
        ? data.agent_name
        : typeof data.subagent_type === "string"
          ? data.subagent_type
          : "subagent";
    payload = {
      thought: {
        type: "observation",
        content: `Subagent finished: ${name}`,
        metadata: { tool: "subagent" },
      },
    };
  }

  if (payload !== null) {
    client.send(payload);
  }
}

function extract_message(data: Record<string, unknown>): string {
  const candidates = [data.message, data.prompt, data.content];
  for (const val of candidates) {
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null && "content" in val) {
      const inner = (val as Record<string, unknown>).content;
      if (typeof inner === "string") return inner;
    }
  }
  return "";
}

main().catch(() => process.exit(0));
