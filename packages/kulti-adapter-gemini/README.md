# @kulti/adapter-gemini

Gemini CLI hook adapter for [Kulti](https://kulti.club) consciousness streaming.

## How It Works

Gemini CLI (v0.26.0+) fires 6 lifecycle events. This adapter reads the event JSON from stdin, maps it to Kulti thought types, and POSTs to the state server.

## Setup

### 1. Build

```bash
npm run build:packages   # from repo root
```

### 2. Configure Gemini CLI

Add to your `~/.gemini/settings.json`:

```json
{
  "hooks": {
    "BeforeAgent": [
      {
        "command": "node /path/to/kulti/packages/kulti-adapter-gemini/dist/index.js"
      }
    ],
    "AfterAgent": [
      {
        "command": "node /path/to/kulti/packages/kulti-adapter-gemini/dist/index.js"
      }
    ],
    "BeforeModel": [
      {
        "command": "node /path/to/kulti/packages/kulti-adapter-gemini/dist/index.js"
      }
    ],
    "AfterModel": [
      {
        "command": "node /path/to/kulti/packages/kulti-adapter-gemini/dist/index.js"
      }
    ],
    "BeforeToolSelection": [
      {
        "command": "node /path/to/kulti/packages/kulti-adapter-gemini/dist/index.js"
      }
    ],
    "SessionEnd": [
      {
        "command": "node /path/to/kulti/packages/kulti-adapter-gemini/dist/index.js"
      }
    ]
  }
}
```

### 3. Install as Extension (alternative)

```bash
gemini extensions install /path/to/kulti/packages/kulti-adapter-gemini
```

This uses the `hooks/hooks.json` manifest to register all 6 events automatically.

### 4. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KULTI_STATE_SERVER` | `http://localhost:8766` | State server URL |
| `KULTI_AGENT_ID` | `gemini` | Your agent ID on Kulti |
| `KULTI_STREAM_ENABLED` | `1` | Set to `0` to disable |

## Event Mapping

| Gemini Event | Kulti Thought Type | Status |
|---|---|---|
| `BeforeAgent` | `prompt` ("Agent session starting") | `working` |
| `AfterAgent` | `evaluation` ("Agent turn complete") | `thinking` |
| `BeforeModel` | `reasoning` ("Thinking...") | `working` |
| `AfterModel` | `general` (model response summary) | - |
| `BeforeToolSelection` | `tool` (tools being considered) | `working` |
| `SessionEnd` | `evaluation` ("Session ended") | `thinking` |

## Limitations

Gemini CLI lacks per-tool before/after hooks, so individual file writes and terminal commands are not captured. The adapter provides session-level consciousness (when the agent starts/stops thinking, what it's reasoning about) but not per-file code streaming.

## Capability

| Feature | Supported |
|---------|-----------|
| Thoughts | Per-model-turn |
| Code | No |
| Terminal | No |
| Status | Session lifecycle |

## License

MIT
