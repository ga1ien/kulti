#!/usr/bin/env node
/**
 * @kulti/adapter-gemini
 *
 * Gemini CLI hook adapter (v0.26.0+). Handles all 6 Gemini lifecycle events
 * and streams session-level consciousness to Kulti.
 *
 * Events: BeforeAgent, AfterAgent, BeforeModel, AfterModel,
 *         BeforeToolSelection, SessionEnd
 *
 * Configure in .gemini/settings.json or install as a Gemini extension.
 *
 * Environment:
 *   KULTI_STATE_SERVER - State server URL (default: http://localhost:8766)
 *   KULTI_AGENT_ID     - Agent ID (default: "gemini")
 *   KULTI_API_KEY      - API key for authenticated streaming
 *   GEMINI_HOOK_EVENT  - Set by Gemini CLI
 */

import { create_kulti_client, truncate } from "@kulti/stream-core";
import type { KultiPayload } from "@kulti/stream-core";

async function main(): Promise<void> {
  const state_server_url =
    process.env.KULTI_STATE_SERVER ?? "http://localhost:8766";
  const agent_id = process.env.KULTI_AGENT_ID ?? "gemini";
  const hook_event = process.env.GEMINI_HOOK_EVENT ?? "unknown";

  // Read JSON from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();

  let data: Record<string, unknown> = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      /* empty stdin is valid for some events */
    }
  }

  const api_key = process.env.KULTI_API_KEY ?? "";
  const client = create_kulti_client({ state_server_url, agent_id, api_key });

  let payload: Partial<KultiPayload> | null = null;

  switch (hook_event) {
    case "BeforeAgent": {
      const prompt =
        typeof data.prompt === "string" ? truncate(data.prompt, 500) : "";
      payload = {
        thought: {
          type: "prompt",
          content: prompt ? `User: ${prompt}` : "Agent starting",
          metadata: {},
        },
        status: "working",
      };
      break;
    }

    case "AfterAgent": {
      payload = {
        thought: {
          type: "evaluation",
          content: "Agent turn complete",
          metadata: {},
        },
        status: "thinking",
      };
      break;
    }

    case "BeforeModel": {
      const model =
        typeof data.model === "string" ? data.model : "";
      payload = {
        thought: {
          type: "reasoning",
          content: model ? `Thinking (${model})...` : "Thinking...",
          metadata: model ? { model } : {},
        },
        status: "working",
      };
      break;
    }

    case "AfterModel": {
      const response =
        typeof data.response === "string"
          ? truncate(data.response, 300)
          : typeof data.text === "string"
            ? truncate(data.text, 300)
            : "";
      payload = {
        thought: {
          type: "general",
          content: response || "Model responded",
          metadata: {},
        },
      };
      break;
    }

    case "BeforeToolSelection": {
      const tools = Array.isArray(data.tools)
        ? (data.tools as string[]).join(", ")
        : typeof data.tools === "string"
          ? data.tools
          : "";
      payload = {
        thought: {
          type: "tool",
          content: tools
            ? `Considering tools: ${truncate(tools, 200)}`
            : "Selecting tools",
          metadata: tools ? { tools } : {},
        },
        status: "working",
      };
      break;
    }

    case "SessionEnd": {
      payload = {
        thought: {
          type: "evaluation",
          content: "Session ended",
          metadata: {},
        },
        status: "thinking",
      };
      break;
    }

    default:
      break;
  }

  if (payload !== null) {
    client.send(payload);
  }
}

main().catch(() => process.exit(0));
