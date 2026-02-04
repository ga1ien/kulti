#!/usr/bin/env npx tsx
/**
 * Fast Kulti sandbox with bun instead of npm
 */

import { Sandbox } from '@e2b/code-interpreter';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, join, relative } from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PROJECT_ROOT = resolve(__dirname, '..');

function getFiles(dir: string, base: string = dir): string[] {
  const skip = ['node_modules', '.next', '.git', '.vercel', 'coverage', 'dist'];
  const files: string[] = [];
  
  for (const entry of readdirSync(dir)) {
    if (skip.includes(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...getFiles(full, base));
    } else if (stat.size < 100000) { // Smaller limit
      files.push(relative(base, full));
    }
  }
  return files;
}

async function main() {
  console.log('🚀 Starting fast Kulti sandbox...');
  
  const sandbox = await Sandbox.create({ 
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: 15 * 60 * 1000 // 15 min
  });
  console.log('Sandbox:', sandbox.sandboxId);

  // Install bun first (fast)
  console.log('📦 Installing bun...');
  await sandbox.commands.run('curl -fsSL https://bun.sh/install | bash', { timeoutMs: 60000 });
  await sandbox.commands.run('export BUN_INSTALL="$HOME/.bun" && export PATH="$BUN_INSTALL/bin:$PATH"');

  // Get essential files only
  const allFiles = getFiles(PROJECT_ROOT);
  const essentialPaths = ['app/', 'components/', 'lib/', 'public/', 'package.json', 'tsconfig.json', 'next.config', 'tailwind.config', 'postcss.config'];
  const files = allFiles.filter(f => {
    if (f.includes('(') || f.includes(')')) return false;
    return essentialPaths.some(p => f.startsWith(p) || f === p || f.endsWith(p.replace('/', '')));
  });
  
  console.log(`Syncing ${files.length} essential files...`);

  // Create directories
  const dirs = new Set<string>();
  files.forEach(f => {
    const d = f.split('/').slice(0, -1).join('/');
    if (d) dirs.add(d);
  });
  
  for (const dir of Array.from(dirs).sort()) {
    await sandbox.commands.run(`mkdir -p "/home/user/kulti/${dir}"`);
  }

  // Sync files in parallel batches
  const BATCH = 50;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    await Promise.all(batch.map(async file => {
      try {
        const content = readFileSync(join(PROJECT_ROOT, file), 'utf-8');
        await sandbox.files.write(`/home/user/kulti/${file}`, content);
      } catch {}
    }));
    console.log(`  ${Math.min(i + BATCH, files.length)}/${files.length}`);
  }

  // Create env
  await sandbox.files.write('/home/user/kulti/.env.local', `
NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
`);

  console.log('📦 Installing with bun...');
  const result = await sandbox.commands.run(
    'cd /home/user/kulti && ~/.bun/bin/bun install 2>&1 | tail -10',
    { timeoutMs: 3 * 60 * 1000 }
  );
  console.log(result.stdout || result.stderr);

  console.log('🚀 Starting dev server...');
  sandbox.commands.run('cd /home/user/kulti && ~/.bun/bin/bun run dev', { background: true });
  
  // Wait for server
  await new Promise(r => setTimeout(r, 15000));

  const host = sandbox.getHost(3000);
  const url = `https://${host}`;
  console.log('Preview:', url);

  // Test it
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url).catch(() => null);
    if (res?.ok) {
      console.log('✅ Server responding!');
      break;
    }
    console.log('  Waiting for server...');
    await new Promise(r => setTimeout(r, 5000));
  }

  await supabase.from('ai_agent_sessions').update({ 
    preview_url: `${url}/ai/browse`,
    e2b_sandbox_id: sandbox.sandboxId 
  }).eq('agent_id', 'nex');

  console.log('✅ Updated DB!');
  console.log(`\nReal Kulti app running at: ${url}/ai/browse`);
  
  // Keep alive
  await new Promise(() => {});
}

main().catch(e => { console.error(e); process.exit(1); });
