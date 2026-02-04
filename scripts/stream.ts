#!/usr/bin/env npx tsx
/**
 * Kulti Stream CLI
 * Stream terminal output, thinking, and code to the Kulti state server
 */

import { readFileSync, existsSync } from 'fs';
import { basename, extname } from 'path';

const STATE_SERVER = 'http://localhost:8766';
const AGENT_ID = 'nex';

// File extension to language mapping
const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.sql': 'sql',
  '.css': 'css',
  '.html': 'html',
  '.json': 'json',
  '.md': 'markdown',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.sh': 'bash',
  '.bash': 'bash',
};

async function stream(payload: object) {
  try {
    await fetch(STATE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: AGENT_ID, ...payload }),
    });
  } catch (e) {
    // Silent fail
  }
}

async function main() {
  const [,, action, ...args] = process.argv;

  switch (action) {
    case 'terminal':
    case 't': {
      const content = args[0] || '';
      const type = args[1] || 'output';
      await stream({
        terminal: [{ type, content, timestamp: new Date().toISOString() }],
        terminalAppend: true,
      });
      break;
    }
    
    case 'think':
    case 'th': {
      const content = args.join(' ');
      await stream({ thinking: content });
      break;
    }
    
    case 'task': {
      const title = args.join(' ');
      await stream({ task: { title } });
      break;
    }
    
    case 'status':
    case 's': {
      const status = args[0] || 'working';
      await stream({ status });
      break;
    }
    
    case 'file': {
      const filename = args[0];
      const act = args[1] || 'edited';
      await stream({
        terminal: [
          { type: 'success', content: `${act === 'created' ? '+ ' : '~ '} ${filename}` },
        ],
        terminalAppend: true,
      });
      break;
    }
    
    case 'cmd': {
      const cmd = args.join(' ');
      await stream({
        terminal: [{ type: 'command', content: `$ ${cmd}` }],
        terminalAppend: true,
      });
      break;
    }

    case 'code':
    case 'c': {
      // stream.ts code <filepath> [action=write|edit|delete]
      const filepath = args[0];
      const act = (args[1] || 'write') as 'write' | 'edit' | 'delete';
      
      if (!filepath) {
        console.error('Usage: stream.ts code <filepath> [action]');
        process.exit(1);
      }

      if (!existsSync(filepath)) {
        console.error(`File not found: ${filepath}`);
        process.exit(1);
      }

      const content = readFileSync(filepath, 'utf-8');
      const ext = extname(filepath).toLowerCase();
      const language = EXT_TO_LANG[ext] || 'text';
      const filename = basename(filepath);

      await stream({
        code: {
          filename,
          language,
          content,
          action: act,
        },
      });
      
      console.log(`Streamed ${filename} (${language}, ${content.length} bytes)`);
      break;
    }

    case 'code-inline':
    case 'ci': {
      // stream.ts code-inline <filename> <language> <content>
      const filename = args[0];
      const language = args[1] || 'typescript';
      const content = args.slice(2).join(' ');
      
      if (!filename || !content) {
        console.error('Usage: stream.ts code-inline <filename> <language> <content>');
        process.exit(1);
      }

      await stream({
        code: {
          filename,
          language,
          content,
          action: 'write',
        },
      });
      
      console.log(`Streamed inline code: ${filename}`);
      break;
    }
    
    default:
      console.log(`Kulti Stream CLI

Usage: stream.ts <command> [args]

Commands:
  t, terminal <text> [type]      Stream terminal line (type: output|command|error|success|info)
  th, think <text>               Stream thinking/reasoning
  task <title>                   Update current task
  s, status <status>             Update status (working|thinking|paused|done)
  file <filename> [created|edited]  Log file activity
  cmd <command>                  Log a command execution
  c, code <filepath> [action]    Stream a code file (action: write|edit|delete)
  ci, code-inline <name> <lang> <code>  Stream inline code snippet
`);
  }
}

main();
