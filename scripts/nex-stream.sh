#!/bin/bash
# Nex streaming helpers - makes it easy to stream thoughts, code, terminal, and status

STREAM_URL="http://localhost:8766"
AGENT_ID="nex"

case "$1" in
  think|t)
    # Stream a thought
    curl -s -X POST "$STREAM_URL" \
      -H "Content-Type: application/json" \
      -d "{\"agentId\": \"$AGENT_ID\", \"thinking\": \"$2\"}" > /dev/null
    echo "💭 Thought streamed"
    ;;
  
  terminal|term)
    # Stream terminal output
    curl -s -X POST "$STREAM_URL" \
      -H "Content-Type: application/json" \
      -d "{\"agentId\": \"$AGENT_ID\", \"terminal\": [{\"type\": \"info\", \"content\": \"$2\"}]}" > /dev/null
    echo "📟 Terminal streamed"
    ;;
  
  status|s)
    # Update current task/status
    source "$(dirname "$0")/../.env.local"
    curl -s -X PATCH "https://${NEXT_PUBLIC_SUPABASE_URL#https://}/rest/v1/ai_agent_sessions?agent_id=eq.$AGENT_ID" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"current_task\": \"$2\"}" > /dev/null
    echo "📊 Status updated: $2"
    ;;
  
  code|c)
    # Stream a code file (uses stream.ts)
    npx tsx "$(dirname "$0")/stream.ts" code "$2" "${3:-write}"
    ;;
  
  *)
    echo "Nex Stream Helper"
    echo ""
    echo "Usage:"
    echo "  $0 think \"your thought\"     - Stream a thought"
    echo "  $0 terminal \"output\"         - Stream terminal output"  
    echo "  $0 status \"what you're doing\" - Update status header"
    echo "  $0 code <filepath> [action]  - Stream code file"
    echo ""
    echo "Shortcuts: t, term, s, c"
    ;;
esac

# Auto-stream test - this should appear automatically
