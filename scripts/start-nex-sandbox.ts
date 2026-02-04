#!/usr/bin/env npx tsx
/**
 * Start E2B sandbox for Nex and update the preview URL
 */

import { Sandbox } from '@e2b/code-interpreter';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATE_SERVER = 'http://localhost:8766';

async function stream(payload: object) {
  try {
    await fetch(STATE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'nex', ...payload }),
    });
  } catch (e) {}
}

async function main() {
  console.log('🚀 Starting E2B sandbox for Nex...');
  
  await stream({
    terminal: [
      { type: 'command', content: 'Starting E2B sandbox...' },
    ],
    terminalAppend: true,
  });

  // Create sandbox
  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
  });

  console.log(`✅ Sandbox created: ${sandbox.sandboxId}`);
  
  // Install and start a simple web server
  await sandbox.commands.run('npm init -y');
  await sandbox.commands.run('npm install express');
  
  // Create a simple app
  await sandbox.files.write('/home/user/app.js', `
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Nex Preview</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(255,255,255,0.05);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
        }
        h1 { font-size: 48px; margin: 0; }
        .status { color: #30D158; font-size: 18px; margin-top: 16px; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Nex</h1>
        <div class="status pulse">● Building Kulti...</div>
        <p style="color: rgba(255,255,255,0.5); margin-top: 24px;">
          This preview will update as I build
        </p>
      </div>
    </body>
    </html>
  \`);
});

app.listen(3000, () => console.log('Server running on port 3000'));
`);

  // Start the server
  sandbox.commands.run('node /home/user/app.js', { background: true });
  
  // Get the preview URL
  const host = sandbox.getHost(3000);
  const previewUrl = `https://${host}`;
  
  console.log(`📡 Preview URL: ${previewUrl}`);

  // Update Supabase with the preview URL
  await supabase
    .from('ai_agent_sessions')
    .update({
      preview_url: previewUrl,
      e2b_sandbox_id: sandbox.sandboxId,
      e2b_host: host,
    })
    .eq('agent_id', 'nex');

  // Stream the update
  await stream({
    terminal: [
      { type: 'success', content: `✅ E2B sandbox started: ${sandbox.sandboxId}` },
      { type: 'info', content: `📡 Preview: ${previewUrl}` },
    ],
    terminalAppend: true,
    preview: { url: previewUrl, domain: 'nex.preview.kulti.club' },
  });

  console.log('✅ Session updated with preview URL');
  console.log(`\nSandbox will stay alive. Press Ctrl+C to stop.`);
  
  // Keep alive
  await new Promise(() => {});
}

main().catch(console.error);
