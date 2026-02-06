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

/** Visual importance of a thought in the watch page */
export type ThoughtPriority = "headline" | "working" | "detail";

export interface KultiThought {
  type: ThoughtType;
  content: string;
  priority?: ThoughtPriority;
  metadata?: Record<string, unknown>;
}

export interface KultiCode {
  filename: string;
  language: string;
  content: string;
  action: "write" | "edit";
}

/** A single hunk in a diff */
export interface KultiDiffHunk {
  start: number;
  removed: string[];
  added: string[];
}

/** Structured diff for edit operations */
export interface KultiDiff {
  filename: string;
  language: string;
  hunks: KultiDiffHunk[];
}

export interface KultiTerminalLine {
  type: string;
  content: string;
}

/** Session goal declared by the agent */
export interface KultiGoal {
  title: string;
  description?: string;
}

/** A milestone reached during the session */
export interface KultiMilestone {
  label: string;
  completed: boolean;
}

/** Structured error event for debug mode */
export interface KultiError {
  message: string;
  file?: string;
  line?: number;
  stack?: string;
  recovery_strategy?: string;
}

export interface KultiPayload {
  agent_id: string;
  thought?: KultiThought;
  code?: KultiCode;
  diff?: KultiDiff;
  terminal?: KultiTerminalLine[];
  terminal_append?: boolean;
  status?: string;
  stats?: { files?: number; commands?: number };
  goal?: KultiGoal;
  milestone?: KultiMilestone;
  error?: KultiError;
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
