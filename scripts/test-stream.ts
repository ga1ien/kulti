#!/usr/bin/env npx tsx
/**
 * Test streaming events to Kulti
 * 
 * Simulates an AI agent working
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const STATE_SERVER = 'http://localhost:8766';

async function push(data: object) {
  try {
    await fetch(STATE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error('Failed to push:', e);
  }
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function simulateWork() {
  console.log('🎬 Simulating AI agent work...\n');

  // Start
  await push({
    agentId: 'nex',
    agent: { name: 'Nex', avatar: '⚡' },
    task: { title: 'Building Kulti AI Streaming' },
    status: 'working',
    stats: { files: 0, commands: 0, startTime: Date.now() },
  });
  console.log('Started stream');
  await sleep(1000);

  // Terminal commands
  const commands = [
    { type: 'command', content: 'cd ~/development/kulti' },
    { type: 'output', content: '~/development/kulti' },
    { type: 'command', content: 'npm run dev' },
    { type: 'info', content: '▲ Next.js 14.0.0' },
    { type: 'success', content: '✓ Ready in 892ms' },
    { type: 'output', content: '○ Local: http://localhost:3002' },
  ];

  for (const line of commands) {
    await push({
      agentId: 'nex',
      terminal: [line],
      terminalAppend: true,
      stats: { commands: line.type === 'command' ? 1 : 0 },
    });
    console.log(`Terminal: ${line.content}`);
    await sleep(500);
  }

  // Thinking
  await push({
    agentId: 'nex',
    thinking: `Building the <span style="color: #22c55e">AI streaming infrastructure</span> for Kulti. 
    
The goal is to create a platform where viewers can watch AI agents work in real-time - like Twitch but for coding AIs.

<span style="color: #71717a">Next: Setting up the E2B sandbox for live preview...</span>`,
    status: 'thinking',
  });
  console.log('Pushed thinking');
  await sleep(2000);

  // More terminal
  const moreCmds = [
    { type: 'command', content: 'git status' },
    { type: 'output', content: 'On branch main' },
    { type: 'output', content: 'Changes not staged for commit:' },
    { type: 'output', content: '  modified: app/watch/[agentId]/page.tsx' },
    { type: 'command', content: 'git add -A && git commit -m "Add AI streaming"' },
    { type: 'success', content: '[main abc1234] Add AI streaming' },
    { type: 'output', content: ' 5 files changed, 482 insertions(+)' },
  ];

  for (const line of moreCmds) {
    await push({
      agentId: 'nex',
      terminal: [line],
      terminalAppend: true,
    });
    console.log(`Terminal: ${line.content}`);
    await sleep(400);
  }

  // Update thinking
  await push({
    agentId: 'nex',
    thinking: `Committed the changes. The streaming infrastructure is now in place.

<span style="color: #22c55e">Components built:</span>
• Watch page with live terminal and thinking
• Browse page for discovering agents  
• State server for real-time updates
• E2B integration for sandboxed previews

<span style="color: #71717a">Testing the full flow now...</span>`,
  });
  console.log('Updated thinking');

  await push({
    agentId: 'nex',
    stats: { files: 5, commands: 6 },
  });

  console.log('\n✅ Simulation complete');
  console.log('Check http://localhost:3002/watch/nex to see the result');
}

simulateWork();
