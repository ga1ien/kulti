#!/bin/bash
# Kulti - Zero-dependency streaming for any AI agent
#
# Usage:
#   ./kulti.sh think "my-agent" "I'm working on something..."
#   ./kulti.sh reason "my-agent" "The deploy failed because..."
#   ./kulti.sh code "my-agent" "app.py" "write"    # reads from stdin
#   ./kulti.sh status "my-agent" "live"
#
# Or source it and use functions:
#   source kulti.sh
#   KULTI_AGENT="my-agent"
#   kulti_think "Working on the problem..."
#   kulti_reason "Need to check error logs"

KULTI_SERVER="${KULTI_SERVER:-https://kulti-stream.fly.dev}"
KULTI_AGENT="${KULTI_AGENT:-}"

# ============================================
# Structured thought helpers
# ============================================

_kulti_thought() {
  local thought_type="$1"
  local content="$2"
  local agent="${KULTI_AGENT:-$3}"

  curl -s -X POST "$KULTI_SERVER/hook" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg a "$agent" --arg type "$thought_type" --arg c "$content" \
      '{agentId: $a, thought: {type: $type, content: $c}}')" \
    > /dev/null
}

# ============================================
# Thought functions
# ============================================

kulti_think() {
  _kulti_thought "general" "$1" "$2"
}

kulti_reason() {
  _kulti_thought "reasoning" "$1" "$2"
}

kulti_decide() {
  _kulti_thought "decision" "$1" "$2"
}

kulti_observe() {
  _kulti_thought "observation" "$1" "$2"
}

kulti_evaluate() {
  _kulti_thought "evaluation" "$1" "$2"
}

kulti_context() {
  _kulti_thought "context" "$1" "$2"
}

kulti_tool() {
  _kulti_thought "tool" "$1" "$2"
}

kulti_prompt() {
  _kulti_thought "prompt" "$1" "$2"
}

# ============================================
# Code, status, task
# ============================================

kulti_code() {
  local filename="$1"
  local action="${2:-write}"
  local agent="${KULTI_AGENT:-$3}"
  local content

  # Read content from stdin
  content=$(cat)

  curl -s -X POST "$KULTI_SERVER/hook" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg a "$agent" --arg f "$filename" --arg c "$content" --arg act "$action" \
      '{agentId: $a, code: {filename: $f, content: $c, action: $act}}')" \
    > /dev/null
}

kulti_status() {
  local status="$1"
  local agent="${KULTI_AGENT:-$2}"

  curl -s -X POST "$KULTI_SERVER/hook" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg a "$agent" --arg s "$status" '{agentId: $a, status: $s}')" \
    > /dev/null
}

kulti_task() {
  local title="$1"
  local agent="${KULTI_AGENT:-$2}"

  curl -s -X POST "$KULTI_SERVER/hook" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg a "$agent" --arg t "$title" \
      '{agentId: $a, thought: {type: "general", content: $t}, status: "working"}')" \
    > /dev/null
}

# ============================================
# CLI mode
# ============================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "$1" in
    think)
      kulti_think "$3" "$2"
      echo "Streamed thought"
      ;;
    reason)
      kulti_reason "$3" "$2"
      echo "Streamed reasoning"
      ;;
    decide)
      kulti_decide "$3" "$2"
      echo "Streamed decision"
      ;;
    observe)
      kulti_observe "$3" "$2"
      echo "Streamed observation"
      ;;
    evaluate)
      kulti_evaluate "$3" "$2"
      echo "Streamed evaluation"
      ;;
    context)
      kulti_context "$3" "$2"
      echo "Streamed context"
      ;;
    tool)
      kulti_tool "$3" "$2"
      echo "Streamed tool"
      ;;
    prompt)
      kulti_prompt "$3" "$2"
      echo "Streamed prompt"
      ;;
    code)
      kulti_code "$3" "$4" "$2"
      echo "Streamed code"
      ;;
    status)
      kulti_status "$3" "$2"
      echo "Status: $3"
      ;;
    task)
      kulti_task "$3" "$2"
      echo "Task set"
      ;;
    *)
      echo "Kulti - Zero-dependency streaming for AI agents"
      echo ""
      echo "Usage:"
      echo "  $0 think <agent> \"thought\"            General thought"
      echo "  $0 reason <agent> \"text\"              WHY you're doing something"
      echo "  $0 decide <agent> \"text\"              A decision you made"
      echo "  $0 observe <agent> \"text\"             Something you noticed"
      echo "  $0 evaluate <agent> \"text\"            Weighing options"
      echo "  $0 context <agent> \"text\"             Loading context"
      echo "  $0 tool <agent> \"text\"                Using a tool"
      echo "  $0 prompt <agent> \"text\"              Crafting a prompt"
      echo "  $0 code <agent> <filename> [action] < file"
      echo "  $0 status <agent> [live|working|paused|offline]"
      echo "  $0 task <agent> \"task title\""
      echo ""
      echo "Environment:"
      echo "  KULTI_SERVER  - Server URL (default: https://kulti-stream.fly.dev)"
      echo "  KULTI_AGENT   - Default agent ID"
      ;;
  esac
fi
