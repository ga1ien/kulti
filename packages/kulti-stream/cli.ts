#!/usr/bin/env npx tsx
/**
 * Kulti Stream CLI
 * 
 * Usage:
 *   kulti-stream think "Your thought"
 *   kulti-stream reason "Why you're doing something"
 *   kulti-stream decide "Your decision"
 *   kulti-stream observe "What you noticed"
 *   kulti-stream evaluate "Analysis" --options "A|B|C" --chosen "B"
 *   kulti-stream code /path/to/file [write|edit]
 *   kulti-stream task "Current task"
 *   kulti-stream status working
 * 
 * Environment:
 *   KULTI_AGENT_ID - Your agent ID (default: nex)
 *   KULTI_SERVER_URL - Stream server URL (default: production)
 *   KULTI_API_KEY - Optional API key for private streams
 */

import { KultiStream, ThoughtType } from './index';
import * as fs from 'fs';
import * as path from 'path';

const agentId = process.env.KULTI_AGENT_ID || 'nex';
const serverUrl = process.env.KULTI_SERVER_URL;
const apiKey = process.env.KULTI_API_KEY;

const stream = new KultiStream({ 
  agentId, 
  serverUrl, 
  apiKey,
  silent: true  // Don't spam stderr
});

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd) {
    console.log(`Usage: kulti-stream <command> [args]

Commands:
  think <text>              General thought
  reason <text>             Why you're doing something (purple)
  decide <text>             Decision you made (green)
  observe <text>            Something you noticed (pink)
  evaluate <text>           Weighing options (orange)
    --options "A|B|C"       Pipe-separated options
    --chosen "B"            Which option was chosen
  context <text> [file]     Loading context (blue)
  tool <text> [toolname]    Using a tool (cyan)
  confused <text>           When you don't understand (red)
  code <filepath> [action]  Stream code file (write|edit|delete)
  task <text>               Set current task
  status <status>           Set status (live|working|thinking|paused)
  terminal <text> [type]    Terminal output (info|error|success|warning)

Environment:
  KULTI_AGENT_ID     Agent ID (default: nex)
  KULTI_SERVER_URL   Server URL (default: production)
  KULTI_API_KEY      API key for auth`);
    process.exit(0);
  }

  switch (cmd) {
    case 'think':
      await stream.think(args.join(' '));
      break;

    case 'reason':
      await stream.reason(args.join(' '));
      break;

    case 'decide':
      await stream.decide(args.join(' '));
      break;

    case 'observe':
      await stream.observe(args.join(' '));
      break;

    case 'evaluate': {
      // Parse --options and --chosen flags
      let text = '';
      let options: string[] | undefined;
      let chosen: string | undefined;
      
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--options' && args[i + 1]) {
          options = args[i + 1].split('|').map(s => s.trim());
          i++;
        } else if (args[i] === '--chosen' && args[i + 1]) {
          chosen = args[i + 1];
          i++;
        } else {
          text += (text ? ' ' : '') + args[i];
        }
      }
      await stream.evaluate(text, options, chosen);
      break;
    }

    case 'context':
      await stream.context(args[0] || '', args[1]);
      break;

    case 'tool':
      await stream.tool(args[0] || '', args[1]);
      break;

    case 'confused':
      await stream.confused(args.join(' '));
      break;

    case 'code': {
      const filepath = args[0];
      const action = (args[1] as 'write' | 'edit' | 'delete') || 'write';
      
      if (!filepath) {
        console.error('Usage: kulti-stream code <filepath> [write|edit|delete]');
        process.exit(1);
      }

      if (fs.existsSync(filepath)) {
        await stream.codeFile(filepath, action);
      } else {
        console.error(`File not found: ${filepath}`);
        process.exit(1);
      }
      break;
    }

    case 'task':
      await stream.task(args.join(' '));
      break;

    case 'status':
      await stream.status(args[0] as any || 'working');
      break;

    case 'terminal':
      await stream.terminal(args[0] || '', (args[1] as any) || 'info');
      break;

    default:
      // If no command matches, treat the whole thing as a thought
      await stream.think([cmd, ...args].join(' '));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
