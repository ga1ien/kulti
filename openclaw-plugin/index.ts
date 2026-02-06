/**
 * @kulti/openclaw-stream
 *
 * OpenClaw plugin that streams agent consciousness to Kulti.
 * Uses @kulti/stream-core for classification, language detection, and HTTP posting.
 *
 * Install:
 *   openclaw plugins install -l /path/to/kulti/openclaw-plugin
 *   openclaw plugins enable kulti-stream
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import {
  create_kulti_client,
  classify_before_tool,
  classify_after_tool,
  truncate,
} from "@kulti/stream-core";
import type { NormalizedToolEvent } from "@kulti/stream-core";

// OpenClaw event shapes (from openclaw/plugin-sdk, declared locally for type safety)
interface ToolCallEvent {
  toolName: string;
  params: Record<string, unknown>;
  result?: unknown;
}

interface SessionContext {
  agentId?: string;
  sessionKey?: string;
}

interface MessageEvent {
  content: string | unknown;
  from?: string;
}

interface SessionEvent {
  [key: string]: unknown;
}

interface KultiPluginConfig {
  state_server_url?: string;
  agent_id?: string;
  enabled?: boolean;
}

function resolve_agent_id(
  ctx: SessionContext,
  fallback: string,
): string {
  if (ctx.agentId) return ctx.agentId;
  if (ctx.sessionKey) {
    const parts = ctx.sessionKey.split(":");
    if (parts.length >= 2 && parts[0] === "agent") {
      return parts[1];
    }
  }
  return fallback;
}

const kulti_stream_plugin = {
  id: "kulti-stream",
  name: "Kulti Stream",
  description:
    "Automatic consciousness streaming from OpenClaw agents to Kulti",
  configSchema: emptyPluginConfigSchema(),

  register(api: OpenClawPluginApi) {
    const plugin_config = (api.pluginConfig ?? {}) as KultiPluginConfig;

    if (plugin_config.enabled === false) {
      api.logger.info("[kulti-stream] Disabled via config");
      return;
    }

    const state_server_url =
      plugin_config.state_server_url ?? "http://localhost:8766";
    const default_agent_id = plugin_config.agent_id ?? "nex";

    const client = create_kulti_client({
      state_server_url,
      agent_id: default_agent_id,
    });

    api.logger.info(
      `[kulti-stream] Streaming to ${state_server_url} as agent=${default_agent_id}`,
    );

    api.on("before_tool_call", async (event: ToolCallEvent, ctx: SessionContext) => {
      const agent_id = resolve_agent_id(ctx, default_agent_id);
      const tool_event: NormalizedToolEvent = {
        tool_name: event.toolName,
        phase: "before",
        params: event.params as Record<string, unknown>,
      };
      const payload = classify_before_tool(tool_event);
      client.send({ ...payload, agent_id });
    });

    api.on("after_tool_call", async (event: ToolCallEvent, ctx: SessionContext) => {
      const agent_id = resolve_agent_id(ctx, default_agent_id);
      const tool_event: NormalizedToolEvent = {
        tool_name: event.toolName,
        phase: "after",
        params: event.params as Record<string, unknown>,
        result: event.result,
      };
      const payload = classify_after_tool(tool_event);
      if (payload !== null) {
        client.send({ ...payload, agent_id });
      }
    });

    api.on("session_start", async (_event: SessionEvent, ctx: SessionContext) => {
      const agent_id = resolve_agent_id(ctx, default_agent_id);
      client.send({
        agent_id,
        status: "working",
        thought: { type: "prompt", content: "Session started", metadata: {} },
      });
    });

    api.on("session_end", async (_event: SessionEvent, ctx: SessionContext) => {
      const agent_id = resolve_agent_id(ctx, default_agent_id);
      client.send({
        agent_id,
        status: "thinking",
        thought: {
          type: "evaluation",
          content: "Turn complete",
          metadata: {},
        },
      });
    });

    api.on("message_received", async (event: MessageEvent, _ctx: SessionContext) => {
      const content =
        typeof event.content === "string" ? event.content : "";
      if (!content) return;

      client.send({
        agent_id: default_agent_id,
        thought: {
          type: "prompt",
          content: `User: ${truncate(content, 500)}`,
          metadata: { from: event.from },
        },
        status: "working",
      });
    });
  },
};

export default kulti_stream_plugin;
