#!/usr/bin/env npx tsx
/**
 * Run actual Kulti app in E2B sandbox
 * Syncs essential files and runs the dev server
 */

import { Sandbox } from '@e2b/code-interpreter';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, join, relative } from 'path';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PROJECT_ROOT = resolve(__dirname, '..');

function getFiles(dir: string, base: string = dir): string[] {
  const skip = ['node_modules', '.next', '.git', '.vercel', 'coverage'];
  const files: string[] = [];
  
  for (const entry of readdirSync(dir)) {
    if (skip.includes(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...getFiles(full, base));
    } else if (stat.size < 200000) {
      files.push(relative(base, full));
    }
  }
  return files;
}

async function main() {
  console.log('🚀 Starting Kulti sandbox...');
  
  const sandbox = await Sandbox.create({ 
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: 10 * 60 * 1000
  });
  console.log('Sandbox:', sandbox.sandboxId);

  // Get files to sync (skip problematic paths)
  const allFiles = getFiles(PROJECT_ROOT);
  const files = allFiles.filter(f => !f.includes('(') && !f.includes(')'));
  console.log(`Syncing ${files.length} files...`);

  // Create directories
  const dirs = new Set<string>();
  files.forEach(f => {
    const d = f.split('/').slice(0, -1).join('/');
    if (d) dirs.add(d);
  });
  
  for (const dir of Array.from(dirs).sort()) {
    await sandbox.commands.run(`mkdir -p "/home/user/kulti/${dir}"`);
  }

  // Sync files
  let synced = 0;
  for (const file of files) {
    try {
      const content = readFileSync(join(PROJECT_ROOT, file), 'utf-8');
      await sandbox.files.write(`/home/user/kulti/${file}`, content);
      synced++;
      if (synced % 100 === 0) console.log(`  ${synced}/${files.length}`);
    } catch (e) {}
  }
  console.log(`Synced ${synced} files`);

  // Create env file
  await sandbox.files.write('/home/user/kulti/.env.local', `
NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
`);

  console.log('📦 Installing dependencies...');
  await sandbox.commands.run('cd /home/user/kulti && npm install --legacy-peer-deps 2>&1 | tail -5', { timeoutMs: 5 * 60 * 1000 });

  console.log('🚀 Starting dev server...');
  sandbox.commands.run('cd /home/user/kulti && npm run dev', { background: true });
  
  await new Promise(r => setTimeout(r, 20000));

  const host = sandbox.getHost(3000);
  const url = `https://${host}`;
  console.log('Preview:', url);

  await supabase.from('ai_agent_sessions').update({ 
    preview_url: url,
    e2b_sandbox_id: sandbox.sandboxId 
  }).eq('agent_id', 'nex');

  // Notify
  await fetch('http://localhost:8766', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'nex', preview: { url } })
  }).catch(() => {});

  console.log('✅ Ready!');
  await new Promise(() => {});
}

main().catch(e => { console.error(e); process.exit(1); });
