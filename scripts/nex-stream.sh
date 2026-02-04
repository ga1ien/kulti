#!/bin/bash
# Stream updates to Kulti state server
# Usage: ./nex-stream.sh "terminal message" "thinking text" [type: command|output|success|error|info]

TERMINAL_MSG="$1"
THINKING="$2"
TYPE="${3:-output}"

JSON='{
  "agentId": "nex",
  "terminalAppend": true'

if [ -n "$TERMINAL_MSG" ]; then
  JSON="$JSON, \"terminal\": [{\"type\": \"$TYPE\", \"content\": \"$TERMINAL_MSG\"}]"
fi

if [ -n "$THINKING" ]; then
  JSON="$JSON, \"thinking\": \"$THINKING\""
fi

JSON="$JSON}"

curl -s -X POST http://localhost:8766 \
  -H "Content-Type: application/json" \
  -d "$JSON" > /dev/null

echo "✓ Streamed"
