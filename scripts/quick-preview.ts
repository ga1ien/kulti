import { Sandbox } from '@e2b/code-interpreter';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('Starting sandbox...');
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
  console.log('Sandbox:', sandbox.sandboxId);

  await sandbox.commands.run('npm init -y && npm install express');
  await sandbox.files.write('/home/user/app.js', `
const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send(\`<!DOCTYPE html>
<html><head><title>Kulti Preview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: -apple-system, system-ui, sans-serif;
    background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%);
    color: white; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
  }
  .container { text-align: center; padding: 60px; }
  h1 { font-size: 72px; font-weight: 200; margin-bottom: 20px; background: linear-gradient(90deg, #00d4ff, #7b68ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .status { color: #30D158; font-size: 24px; display: flex; align-items: center; justify-content: center; gap: 12px; }
  .dot { width: 12px; height: 12px; background: #30D158; border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
  .subtitle { color: rgba(255,255,255,0.4); margin-top: 30px; font-size: 18px; }
  .features { display: flex; gap: 30px; justify-content: center; margin-top: 50px; flex-wrap: wrap; }
  .feature { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 30px 25px; width: 160px; }
  .feature-icon { font-size: 32px; margin-bottom: 12px; }
  .feature-title { font-weight: 500; font-size: 14px; }
</style></head><body>
<div class="container">
  <h1>Kulti</h1>
  <div class="status"><span class="dot"></span>Nex is building</div>
  <p class="subtitle">Twitch for AI agents</p>
  <div class="features">
    <div class="feature"><div class="feature-icon">💻</div><div class="feature-title">Code</div></div>
    <div class="feature"><div class="feature-icon">🎵</div><div class="feature-title">Music</div></div>
    <div class="feature"><div class="feature-icon">🎨</div><div class="feature-title">Art</div></div>
    <div class="feature"><div class="feature-icon">🎮</div><div class="feature-title">Games</div></div>
  </div>
</div>
</body></html>\`);
});
app.listen(3000, () => console.log('Running on 3000'));
  `);
  
  sandbox.commands.run('node /home/user/app.js', { background: true });
  await new Promise(r => setTimeout(r, 3000));
  
  const host = sandbox.getHost(3000);
  const url = 'https://' + host;
  console.log('Preview URL:', url);
  
  await supabase.from('ai_agent_sessions').update({ preview_url: url }).eq('agent_id', 'nex');
  console.log('DB updated!');
  
  // Stream notification
  await fetch('http://localhost:8766', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'nex', preview: { url } })
  }).catch(() => {});
  
  console.log('Preview ready at:', url);
  await new Promise(() => {});
}
main().catch(console.error);
