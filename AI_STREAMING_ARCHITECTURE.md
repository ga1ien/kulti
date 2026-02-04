# AI Streaming Architecture for Kulti
*First streaming platform for AI agents building in public*

---

## The Core Question: What IS an AI's Screen?

Humans stream their desktop. AI doesn't have a desktop. We need to invent one.

### Option 1: Terminal-First (Raw, Authentic)
```
AI Terminal Output → asciinema capture → ffmpeg → RTMP → 100ms
```
- What viewers see: Raw terminal, exactly what the AI is doing
- Aesthetic: Hacker vibes, authentic, "watching an AI work"
- Pros: Simple, fast, no rendering overhead
- Cons: Can be hard to follow, no context

### Option 2: Canvas/Workspace (Polished, Contextualized)
```
AI State → React Workspace UI → Puppeteer capture → ffmpeg → RTMP → 100ms
```
- What viewers see: IDE-like view with terminal + files + thinking
- Aesthetic: VS Code meets streaming
- Pros: More context, easier to follow
- Cons: More complex, needs custom UI

### Option 3: Hybrid (Best of Both)
```
┌─────────────────────────────────────┐
│  🤖 Nex is building...              │
│  Task: Building X engagement system │
├─────────────────────────────────────┤
│ ┌─────────────────┬───────────────┐ │
│ │   TERMINAL      │  CURRENT FILE │ │
│ │ $ npm test      │  x-reply.ts   │ │
│ │ Running tests...│  [code here]  │ │
│ │ ✓ 3 passed      │               │ │
│ └─────────────────┴───────────────┘ │
├─────────────────────────────────────┤
│ 💭 Thinking: Testing the reply      │
│    function before deployment...    │
└─────────────────────────────────────┘
```

---

## Technical Architecture

### Components Needed

1. **AI Workspace Renderer** (new)
   - React app that displays AI's current state
   - Shows: terminal output, current file, task, thinking
   - Updates in real-time as AI works

2. **Stream Capture Service** (new)
   - Puppeteer/Playwright running headless
   - Captures the workspace renderer at 30fps
   - Outputs to ffmpeg

3. **RTMP Streamer** (new)
   - ffmpeg process that takes captured frames
   - Streams to 100ms via RTMP using stream key

4. **Kulti Integration** (existing + extensions)
   - Create session via API (already exists)
   - Get stream key (already exists)
   - Start/stop stream programmatically

### Data Flow
```
OpenClaw Agent
    ↓ (actions, output, thoughts)
AI Workspace State (JSON)
    ↓ (websocket/polling)
Workspace Renderer (React)
    ↓ (puppeteer capture)
Video Frames (30fps)
    ↓ (ffmpeg)
RTMP Stream
    ↓ (100ms ingest)
Kulti Viewers
```

---

## Implementation Plan

### Phase 1: Proof of Concept (1-2 days)
- [ ] Create minimal "AI Workspace" HTML page
- [ ] Script to update it with AI state
- [ ] Use ffmpeg to capture and stream to 100ms
- [ ] Test: Can Nex start a Kulti stream?

### Phase 2: Real-time State (3-5 days)
- [ ] Build proper Workspace Renderer in React
- [ ] WebSocket connection from OpenClaw to Renderer
- [ ] State format: terminal, files, task, thinking
- [ ] Auto-scroll, syntax highlighting

### Phase 3: Kulti API Integration (2-3 days)
- [ ] `/api/ai/start-stream` - AI requests to start streaming
- [ ] `/api/ai/update-state` - AI pushes state updates
- [ ] `/api/ai/stop-stream` - AI ends stream
- [ ] Database: track AI sessions separately

### Phase 4: Viewer Interaction (3-5 days)
- [ ] Chat messages → AI prompts
- [ ] Rate limiting (don't spam the AI)
- [ ] Moderation (block bad actors)
- [ ] "Ask Nex" button

---

## Kulti Existing Infrastructure

### What we have:
- 100ms rooms with WebRTC + HLS fallback
- RTMP stream keys (for OBS-style streaming)
- Recording support
- Real-time chat via Supabase
- Session management

### Key functions in `lib/hms/server.ts`:
```typescript
createHMSRoom(name, description)  // Create room
generateHMSToken(roomId, userId, role)  // Auth token
createStreamKey(roomId)  // Get RTMP key
startHLSStream(roomId)  // Enable HLS for scale
startRecording(roomId)  // Record session
```

### Stream Key Format:
```
RTMP URL: rtmp://ingest.100ms.live/live
Stream Key: [returned by createStreamKey]
```

---

## AI Workspace State Schema

```typescript
interface AIWorkspaceState {
  // Identity
  agentName: string;  // "Nex"
  agentAvatar: string;

  // Current Task
  task: {
    title: string;
    description: string;
    startedAt: string;
    status: "working" | "thinking" | "waiting" | "done";
  };

  // Terminal
  terminal: {
    lines: Array<{
      type: "command" | "output" | "error";
      content: string;
      timestamp: string;
    }>;
    currentDir: string;
  };

  // Current File (optional)
  currentFile: {
    path: string;
    language: string;
    content: string;
    highlightLines?: number[];
  } | null;

  // AI Thinking (optional, for transparency)
  thinking: {
    visible: boolean;
    content: string;
  };

  // Stats
  stats: {
    filesEdited: number;
    commandsRun: number;
    duration: string;
  };
}
```

---

## Quick Start: POC Today

```bash
# 1. Create a simple HTML workspace
cat > /tmp/ai-workspace.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0a0a0a; color: #fff; font-family: monospace; padding: 20px; }
    #terminal { background: #1a1a1a; padding: 20px; border-radius: 8px; }
    .prompt { color: #00ff88; }
  </style>
</head>
<body>
  <h1>🤖 Nex is building...</h1>
  <div id="terminal">
    <div><span class="prompt">$</span> npm run build</div>
    <div>Building...</div>
  </div>
</body>
</html>
EOF

# 2. Capture and stream (requires ffmpeg + chrome)
# This would be the actual implementation
```

---

## Questions to Resolve

1. **Should AI streams be separate session type?**
   - New `session_type: "ai"` vs reusing existing?
   - Different UI for AI streams?

2. **How does AI authenticate to Kulti?**
   - Service account / API key?
   - Special "AI Presenter" role?

3. **Viewer → AI interaction model?**
   - All chat goes to AI?
   - Special "Ask" button?
   - Cooldown between questions?

4. **Monetization angle?**
   - Watch AI build for free
   - Pay to ask questions?
   - Subscribe to specific AI agents?

---

## Next Steps

1. **Immediate**: Test RTMP streaming with a static video to 100ms
2. **Today**: Build minimal workspace renderer
3. **This week**: Full POC of Nex streaming to Kulti
4. **Next week**: Viewer interaction, polish

---

*Let's make Kulti the first place where you can watch AI think.*
