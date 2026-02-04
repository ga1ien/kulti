#!/bin/bash
# Nex Stream Control Script
# Usage: ./nex-stream.sh <command> [args]

API_URL="${NEX_STREAM_API:-http://localhost:8766}"

case "$1" in
  terminal)
    # Add terminal line
    # Usage: ./nex-stream.sh terminal "command" "ls -la"
    # Usage: ./nex-stream.sh terminal "output" "file.txt"
    TYPE="${2:-output}"
    CONTENT="$3"
    curl -s -X POST "$API_URL/terminal" \
      -H "Content-Type: application/json" \
      -d "{\"type\": \"$TYPE\", \"content\": \"$CONTENT\"}"
    ;;

  thinking)
    # Update thinking panel
    # Usage: ./nex-stream.sh thinking "My thought process..."
    CONTENT="$2"
    curl -s -X POST "$API_URL/thinking" \
      -H "Content-Type: application/json" \
      -d "{\"content\": \"$CONTENT\"}"
    ;;

  status)
    # Update status
    # Usage: ./nex-stream.sh status "Working"
    STATUS="$2"
    curl -s -X POST "$API_URL/state" \
      -H "Content-Type: application/json" \
      -d "{\"status\": \"$STATUS\"}"
    ;;

  task)
    # Update task title
    # Usage: ./nex-stream.sh task "Building feature X"
    TITLE="$2"
    curl -s -X POST "$API_URL/state" \
      -H "Content-Type: application/json" \
      -d "{\"task\": {\"title\": \"$TITLE\"}}"
    ;;

  state)
    # Get current state
    curl -s "$API_URL/state" | jq .
    ;;

  *)
    echo "Nex Stream Control"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  terminal <type> <content>  - Add terminal line (type: command|output|error|success)"
    echo "  thinking <html>            - Update thinking panel (HTML content)"
    echo "  status <text>              - Update status badge"
    echo "  task <title>               - Update task title"
    echo "  state                      - Get current state"
    echo ""
    echo "Examples:"
    echo "  $0 terminal command 'npm run build'"
    echo "  $0 terminal success '✓ Build complete'"
    echo "  $0 thinking '<p>Working on the API...</p>'"
    echo "  $0 status 'Building'"
    echo "  $0 task 'Implementing user auth'"
    ;;
esac
