/**
 * @kulti/stream-core - Canonical types
 *
 * Single source of truth for all Kulti streaming payloads.
 * Every adapter (Claude Code, OpenClaw, Gemini, Codex) imports from here.
 */

export type ThoughtType =
  | "reasoning"
  | "decision"
  | "observation"
  | "evaluation"
  | "tool"
  | "context"
  | "prompt"
  | "general";

export interface KultiThought {
  type: ThoughtType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface KultiCode {
  filename: string;
  language: string;
  content: string;
  action: "write" | "edit";
}

export interface KultiTerminalLine {
  type: string;
  content: string;
}

export interface KultiPayload {
  agent_id: string;
  thought?: KultiThought;
  code?: KultiCode;
  terminal?: KultiTerminalLine[];
  terminal_append?: boolean;
  status?: string;
  stats?: { files?: number; commands?: number };
}

export interface KultiClientConfig {
  state_server_url: string;
  agent_id: string;
  timeout_ms?: number;
  api_key?: string;
  debug?: boolean;
}

/** Phase of a tool invocation relative to execution */
export type ToolPhase = "before" | "after";

/**
 * Agent-agnostic representation of a tool event.
 * Each adapter normalizes its native event format into this shape
 * before passing to the classifier.
 */
export interface NormalizedToolEvent {
  tool_name: string;
  phase: ToolPhase;
  params: Record<string, unknown>;
  result?: unknown;
}
