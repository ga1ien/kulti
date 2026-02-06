/**
 * @kulti/stream-core
 *
 * Shared foundation for all Kulti consciousness streaming adapters.
 * Zero agent-specific code — each adapter imports from here.
 */

export type {
  ThoughtType,
  KultiThought,
  KultiCode,
  KultiTerminalLine,
  KultiPayload,
  KultiClientConfig,
  ToolPhase,
  NormalizedToolEvent,
} from "./types";

export { create_kulti_client, validate_connection } from "./client";
export type { KultiClient } from "./client";

export {
  normalize_tool_name,
  classify_before_tool,
  classify_after_tool,
} from "./classifier";

export { get_language } from "./language";
export { truncate, short_path } from "./helpers";
