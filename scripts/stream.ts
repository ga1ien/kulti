#!/usr/bin/env npx tsx
/**
 * Kulti Stream CLI
 * Stream terminal output and thinking to the Kulti state server
 */

const STATE_SERVER = 'http://localhost:8766';
const AGENT_ID = 'nex';

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
          { type: 'success', content: `${act === 'created' ? '📝' : '✏️'} ${filename}` },
        ],
        terminalAppend: true,
      });
      break;
    }
    
    case 'cmd': {
      const cmd = args.join(' ');
      await stream({
        terminal: [{ type: 'command', content: cmd }],
        terminalAppend: true,
      });
      break;
    }
    
    default:
      console.log('Usage: stream.ts t|think|task|status|file|cmd [args]');
  }
}

main();
