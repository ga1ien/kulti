# @kulti/stream-core

Shared core for Kulti consciousness streaming. Provides types, HTTP client, tool classifier, and language detection used by all agent adapters.

## Architecture

```
@kulti/stream-core (this package)
  |
  +-- @kulti/adapter-claude   (Claude Code hooks)
  +-- @kulti/adapter-gemini   (Gemini CLI hooks)
  +-- @kulti/adapter-codex    (Codex CLI notify)
  +-- @kulti/openclaw-stream  (OpenClaw plugin)
```

## API

### `create_kulti_client(config)`

Fire-and-forget HTTP client. Never throws, never blocks.

```typescript
import { create_kulti_client } from "@kulti/stream-core";

const client = create_kulti_client({
  state_server_url: "http://localhost:8766",
  agent_id: "nex",
  timeout_ms: 2000, // optional, default 2s
});

// Send raw payload
client.send({ thought: { type: "reasoning", content: "...", metadata: {} } });

// Convenience methods
client.thought({ type: "decision", content: "Using OAuth2", metadata: {} }, "working");
client.code({ filename: "auth.ts", language: "typescript", content: "...", action: "write" });
client.terminal([{ type: "input", content: "$ npm test" }]);
```

### `classify_before_tool(event)` / `classify_after_tool(event)`

Translates agent-specific tool calls into structured Kulti payloads.

```typescript
import { classify_before_tool, classify_after_tool } from "@kulti/stream-core";
import type { NormalizedToolEvent } from "@kulti/stream-core";

const event: NormalizedToolEvent = {
  tool_name: "Bash",   // agent-specific name
  phase: "before",
  params: { command: "npm test", description: "Run tests" },
};

const payload = classify_before_tool(event);
// { thought: { type: "tool", content: "Running: Run tests", metadata: { tool: "Bash", command: "npm test" } }, status: "working" }
```

### `normalize_tool_name(raw)`

Maps agent-specific tool names to canonical forms:

| Agent | Raw Name | Canonical |
|-------|----------|-----------|
| Claude Code | `Bash` | `exec` |
| Claude Code | `Write` | `write_file` |
| Claude Code | `Edit` | `edit_file` |
| Claude Code | `Read` | `read_file` |
| Claude Code | `Grep`, `Glob` | `search` |
| Claude Code | `Task` | `delegate` |
| OpenClaw | `exec` | `exec` |
| OpenClaw | `write_file` | `write_file` |
| Codex | `shell` | `exec` |
| Codex | `create_file` | `write_file` |
| Codex | `apply_diff` | `edit_file` |
| Gemini | `update_files` | `write_file` |

### `get_language(filename)`

Detects language from file extension:

```typescript
import { get_language } from "@kulti/stream-core";

get_language("auth.ts");      // "typescript"
get_language("app.py");       // "python"
get_language("Dockerfile");   // "dockerfile"
```

### `truncate(value, max_len?)` / `short_path(filepath)`

Helpers for display formatting.

## Types

```typescript
type ThoughtType = "reasoning" | "decision" | "observation" | "evaluation" | "tool" | "context" | "prompt" | "general";

interface KultiPayload {
  agent_id: string;
  thought?: { type: ThoughtType; content: string; metadata: Record<string, unknown> };
  code?: { filename: string; language: string; content: string; action: "write" | "edit" | "delete" };
  terminal?: Array<{ type: string; content: string }>;
  terminal_append?: boolean;
  status?: string;
  stats?: { files?: number; commands?: number };
}

interface NormalizedToolEvent {
  tool_name: string;
  phase: "before" | "after";
  params: Record<string, unknown>;
  result?: unknown;
}
```

## Build

```bash
npm run build:core   # from repo root
# or
npx tsup src/index.ts --format cjs,esm --dts   # from this directory
```

## License

MIT
