#!/usr/bin/env node
/**
 * @kulti/adapter-codex
 *
 * Codex CLI notify handler for Kulti consciousness streaming.
 *
 * Codex only supports a `notify` callback for agent-turn-complete.
 * This adapter sends a status update to Kulti when Codex finishes a turn.
 *
 * Configure in ~/.codex/config.toml:
 *   notify = ["node", "path/to/packages/kulti-adapter-codex/dist/index.js"]
 *
 * Environment:
 *   KULTI_STATE_SERVER - State server URL (default: http://localhost:8766)
 *   KULTI_AGENT_ID     - Agent ID (default: "codex")
 */

import { create_kulti_client } from "@kulti/stream-core";

async function main(): Promise<void> {
  const state_server_url =
    process.env.KULTI_STATE_SERVER ?? "http://localhost:8766";
  const agent_id = process.env.KULTI_AGENT_ID ?? "codex";

  // Read any data from stdin (Codex may pass turn info)
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();

  let message = "Turn complete";
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (typeof data.message === "string") {
        message = data.message;
      }
    } catch {
      /* plain text or empty — use default message */
    }
  }

  const client = create_kulti_client({ state_server_url, agent_id });

  client.send({
    thought: {
      type: "evaluation",
      content: message,
      metadata: {},
    },
    status: "thinking",
  });
}

main().catch(() => process.exit(0));
