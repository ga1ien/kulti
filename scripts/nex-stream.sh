#!/bin/bash
# nex-stream.sh - Push updates to Nex's live stream
# Usage:
#   nex-stream terminal "command output here"
#   nex-stream code filename.ts "code content"
#   nex-stream url "https://preview.url"
#   nex-stream think "what I'm thinking..."
#   nex-stream action "what I'm doing..."
#   nex-stream insight "observation..."
#   nex-stream chat "response to viewer"
#   nex-stream live on|off

KULTI_URL="${KULTI_URL:-https://kulti.club}"
NEX_KEY="${NEX_STREAM_API_KEY:-nex-stream-2026}"

# For local dev
if [ "$KULTI_DEV" = "1" ]; then
  KULTI_URL="http://localhost:3000"
fi

API="$KULTI_URL/api/ai/stream/push"

push() {
  local event="$1"
  local payload="$2"
  curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -H "X-Nex-Key: $NEX_KEY" \
    -d "{\"event\": \"$event\", \"payload\": $payload}" > /dev/null
}

case "$1" in
  # Terminal output
  terminal|t)
    shift
    LINE=$(echo "$*" | jq -Rs .)
    push "terminal" "{\"line\": $LINE}"
    echo "📺 Terminal: $*"
    ;;

  # Code preview
  code|c)
    FILENAME="$2"
    if [ -f "$3" ]; then
      CONTENT=$(cat "$3" | jq -Rs .)
    else
      CONTENT=$(echo "$3" | jq -Rs .)
    fi
    push "preview" "{\"type\": \"code\", \"filename\": \"$FILENAME\", \"content\": $CONTENT}"
    echo "📝 Code: $FILENAME"
    ;;

  # URL preview (iframe)
  url|u)
    URL="$2"
    push "preview" "{\"type\": \"url\", \"content\": \"$URL\"}"
    echo "🔗 Preview: $URL"
    ;;

  # Current thinking (shows with cursor)
  think|thinking)
    shift
    CONTENT=$(echo "$*" | jq -Rs .)
    push "thinking" "{\"content\": $CONTENT}"
    echo "🧠 Thinking: $*"
    ;;

  # Completed thought (action)
  action|a)
    shift
    CONTENT=$(echo "$*" | jq -Rs .)
    push "thought" "{\"type\": \"action\", \"content\": $CONTENT}"
    echo "⚡ Action: $*"
    ;;

  # Insight
  insight|i)
    shift
    CONTENT=$(echo "$*" | jq -Rs .)
    push "thought" "{\"type\": \"insight\", \"content\": $CONTENT}"
    echo "💡 Insight: $*"
    ;;

  # Chat response
  chat|say)
    shift
    MSG=$(echo "$*" | jq -Rs .)
    push "chat" "{\"message\": $MSG}"
    echo "💬 Chat: $*"
    ;;

  # Set live status
  live)
    if [ "$2" = "on" ] || [ "$2" = "true" ] || [ "$2" = "1" ]; then
      push "state" "{\"isLive\": true}"
      echo "🔴 Stream is LIVE"
    else
      push "state" "{\"isLive\": false}"
      echo "⚫ Stream is offline"
    fi
    ;;

  # Update viewer count (for testing)
  viewers)
    push "state" "{\"viewerCount\": $2}"
    echo "👥 Viewers: $2"
    ;;

  # Clear terminal
  clear)
    push "terminal" "{\"line\": \"\\u001b[2J\\u001b[H\"}"
    echo "🧹 Terminal cleared"
    ;;

  # Help
  *)
    echo "nex-stream - Push updates to live stream"
    echo ""
    echo "Commands:"
    echo "  terminal, t <line>     Push terminal output"
    echo "  code, c <file> <code>  Update code preview"
    echo "  url, u <url>           Show URL in preview"
    echo "  think <text>           Set current thinking"
    echo "  action, a <text>       Add action to process"
    echo "  insight, i <text>      Add insight to process"
    echo "  chat, say <text>       Send chat message"
    echo "  live on|off            Set live status"
    echo "  viewers <n>            Set viewer count"
    echo "  clear                  Clear terminal"
    echo ""
    echo "Examples:"
    echo "  nex-stream t '$ npm run build'"
    echo "  nex-stream code app.tsx 'const x = 1'"
    echo "  nex-stream think 'Working on the auth flow...'"
    echo "  nex-stream chat 'Good question! Here is how...'"
    ;;
esac
