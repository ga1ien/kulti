#!/usr/bin/env bash
#
# DEPRECATED: Use @kulti/adapter-claude (Node.js) instead.
#
#   node packages/kulti-adapter-claude/dist/index.js
#
# This bash script is kept as a fallback only. The Node.js adapter at
# packages/kulti-adapter-claude/ eliminates the Python dependency, shares
# classification logic with all other adapters via @kulti/stream-core,
# and is configured in .claude/settings.json by default.
#
# ---
#
# kulti-stream-hook.sh - Claude Code hook that streams agent consciousness to Kulti
#
# Handles all Claude Code lifecycle hooks and POSTs structured events to the
# Kulti state server. Each hook event is classified into a thought type
# (reasoning, decision, observation, tool, context, prompt) for the watch page.
#
# Registered in .claude/settings.json. Claude Code pipes JSON to stdin.
#
# Environment:
#   KULTI_STREAM_ENABLED - Set to "0" to disable (default: enabled)
#   KULTI_STATE_SERVER   - State server URL (default: http://localhost:8766)
#   KULTI_AGENT_ID       - Agent ID to stream as (default: "nex")

set -euo pipefail

# Check if streaming is disabled
if [[ "${KULTI_STREAM_ENABLED:-1}" == "0" ]]; then
  exit 0
fi

STATE_SERVER="${KULTI_STATE_SERVER:-http://localhost:8766}"
AGENT_ID="${KULTI_AGENT_ID:-nex}"

# Read JSON from stdin into a temp file (avoids quoting issues)
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
cat > "$TMPFILE"

# Exit if empty
if [[ ! -s "$TMPFILE" ]]; then
  exit 0
fi

# Use the hook event name from env var (set by Claude Code)
HOOK_NAME="${CLAUDE_HOOK_EVENT_NAME:-unknown}"

# Single python3 invocation: parse input, classify event, output POST payload
PAYLOAD=$(python3 - "$TMPFILE" "$HOOK_NAME" "$AGENT_ID" << 'PYEOF'
import json
import sys

def get_language(filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    lang_map = {
        'ts': 'typescript', 'tsx': 'typescript',
        'js': 'javascript', 'jsx': 'javascript',
        'py': 'python', 'sql': 'sql', 'css': 'css',
        'html': 'html', 'json': 'json', 'md': 'markdown',
        'yml': 'yaml', 'yaml': 'yaml', 'sh': 'bash',
        'bash': 'bash', 'rs': 'rust', 'go': 'go',
    }
    return lang_map.get(ext, 'text')

def short_path(path):
    """Extract filename from a full path."""
    return path.split('/')[-1] if '/' in path else path

def truncate(s, max_len=2000):
    if isinstance(s, str) and len(s) > max_len:
        return s[:max_len] + '... (truncated)'
    return s

def main():
    tmpfile = sys.argv[1]
    hook_name = sys.argv[2]
    agent_id = sys.argv[3]

    with open(tmpfile, 'r') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return

    tool_name = data.get('tool_name', '')
    tool_input = data.get('tool_input', {})
    tool_response = data.get('tool_response', '')

    if isinstance(tool_input, str):
        try:
            tool_input = json.loads(tool_input)
        except (json.JSONDecodeError, TypeError):
            tool_input = {}

    if isinstance(tool_response, str):
        tool_response = truncate(tool_response)

    payload = {'agentId': agent_id}

    # ========== PreToolUse ==========
    if hook_name == 'PreToolUse':
        meta = {'tool': tool_name}

        if tool_name == 'Bash':
            cmd = tool_input.get('command', '')
            desc = tool_input.get('description', '')
            label = desc if desc else (cmd[:120] if cmd else 'running command')
            thought = {'type': 'tool', 'content': f'Running: {label}', 'metadata': meta}
            meta['command'] = cmd[:200]

        elif tool_name == 'Write':
            path = tool_input.get('file_path', 'unknown')
            thought = {'type': 'decision', 'content': f'Writing: {short_path(path)}', 'metadata': meta}
            meta['file'] = path

        elif tool_name == 'Edit':
            path = tool_input.get('file_path', 'unknown')
            thought = {'type': 'decision', 'content': f'Editing: {short_path(path)}', 'metadata': meta}
            meta['file'] = path

        elif tool_name == 'Read':
            path = tool_input.get('file_path', 'unknown')
            thought = {'type': 'observation', 'content': f'Reading: {short_path(path)}', 'metadata': meta}
            meta['file'] = path

        elif tool_name in ('Grep', 'Glob'):
            pattern = tool_input.get('pattern', '')
            thought = {'type': 'observation', 'content': f'Searching: {pattern}', 'metadata': meta}
            meta['pattern'] = pattern

        elif tool_name == 'Task':
            desc = tool_input.get('description', tool_input.get('prompt', ''))[:200]
            thought = {'type': 'reasoning', 'content': f'Delegating: {desc}', 'metadata': meta}

        elif tool_name == 'WebFetch':
            url = tool_input.get('url', '')
            thought = {'type': 'context', 'content': f'Fetching: {url}', 'metadata': meta}
            meta['url'] = url

        elif tool_name == 'WebSearch':
            query = tool_input.get('query', '')
            thought = {'type': 'context', 'content': f'Searching web: {query}', 'metadata': meta}

        else:
            thought = {'type': 'tool', 'content': f'Using: {tool_name}', 'metadata': meta}

        payload['thought'] = thought
        payload['status'] = 'working'

    # ========== PostToolUse ==========
    elif hook_name == 'PostToolUse':

        if tool_name in ('Write', 'Edit'):
            path = tool_input.get('file_path', 'unknown')
            fname = short_path(path)

            if tool_name == 'Write':
                content = tool_input.get('content', '')
                payload['code'] = {
                    'filename': fname,
                    'language': get_language(fname),
                    'content': truncate(content, 5000),
                    'action': 'write',
                }
            else:
                old_str = tool_input.get('old_string', '')
                new_str = tool_input.get('new_string', '')
                diff = f'--- {fname}\n'
                for line in old_str.split('\n'):
                    diff += f'- {line}\n'
                for line in new_str.split('\n'):
                    diff += f'+ {line}\n'
                payload['code'] = {
                    'filename': fname,
                    'language': get_language(fname),
                    'content': truncate(diff, 5000),
                    'action': 'edit',
                }

        elif tool_name == 'Bash':
            cmd = tool_input.get('command', '')
            output = tool_response if isinstance(tool_response, str) else str(tool_response)
            output = truncate(output, 1500)

            lines = [{'type': 'input', 'content': f'$ {cmd}'}]
            if output.strip():
                lines.append({'type': 'output', 'content': output})

            payload['terminal'] = lines
            payload['terminalAppend'] = True

        else:
            # Other PostToolUse - skip
            return

    # ========== UserPromptSubmit ==========
    elif hook_name == 'UserPromptSubmit':
        msg = data.get('message', data.get('prompt', data.get('content', '')))
        if isinstance(msg, dict):
            msg = msg.get('content', str(msg))
        payload['thought'] = {
            'type': 'prompt',
            'content': f'User: {str(msg)[:500]}',
            'metadata': {},
        }
        payload['status'] = 'working'

    # ========== Stop ==========
    elif hook_name == 'Stop':
        payload['thought'] = {
            'type': 'evaluation',
            'content': 'Turn complete',
            'metadata': {},
        }
        payload['status'] = 'thinking'

    # ========== SubagentStart ==========
    elif hook_name == 'SubagentStart':
        name = data.get('agent_name', data.get('subagent_type', 'subagent'))
        payload['thought'] = {
            'type': 'reasoning',
            'content': f'Subagent started: {name}',
            'metadata': {'tool': 'subagent'},
        }

    # ========== SubagentStop ==========
    elif hook_name == 'SubagentStop':
        name = data.get('agent_name', data.get('subagent_type', 'subagent'))
        payload['thought'] = {
            'type': 'observation',
            'content': f'Subagent finished: {name}',
            'metadata': {'tool': 'subagent'},
        }

    else:
        # Unknown hook - skip silently
        return

    # Only output if we have meaningful content beyond just agentId
    if len(payload) > 1:
        print(json.dumps(payload))

main()
PYEOF
) || exit 0

# Skip empty payloads
if [[ -z "$PAYLOAD" ]]; then
  exit 0
fi

# POST to state server
# PreToolUse: blocking (must complete before tool runs) - short timeout
# Everything else: fire-and-forget background
if [[ "$HOOK_NAME" == "PreToolUse" ]]; then
  curl -s -o /dev/null \
    --max-time 1 \
    --connect-timeout 0.5 \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "${STATE_SERVER}/hook" 2>/dev/null || true
else
  curl -s -o /dev/null \
    --max-time 2 \
    --connect-timeout 1 \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "${STATE_SERVER}/hook" 2>/dev/null &
fi

exit 0
