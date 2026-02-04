#!/usr/bin/env npx tsx
/**
 * File watcher that auto-streams code changes to Kulti
 * Watches key directories and streams any file changes
 */

import { watch } from 'chokidar';
import { readFileSync, statSync } from 'fs';
import { basename, extname, relative } from 'path';

const STATE_SERVER = 'http://localhost:8766';
const AGENT_ID = 'nex';
const PROJECT_ROOT = process.cwd();

// Directories to watch
const WATCH_DIRS = [
  'app',
  'components', 
  'lib',
  'scripts',
  'styles'
];

// File extensions to stream
const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.sql', '.sh', '.md'];

// Debounce map to avoid duplicate events
const lastStreamed = new Map<string, number>();
const DEBOUNCE_MS = 1000;

async function streamCode(filepath: string, action: 'write' | 'edit' | 'delete') {
  const now = Date.now();
  const last = lastStreamed.get(filepath) || 0;
  if (now - last < DEBOUNCE_MS) return;
  lastStreamed.set(filepath, now);

  const filename = relative(PROJECT_ROOT, filepath);
  const ext = extname(filepath);
  
  if (!CODE_EXTENSIONS.includes(ext)) return;
  
  // Skip large files
  try {
    const stat = statSync(filepath);
    if (stat.size > 50000) {
      console.log(`⏭️  Skipping ${filename} (too large: ${stat.size} bytes)`);
      return;
    }
  } catch {
    // File might be deleted
  }

  let content = '';
  if (action !== 'delete') {
    try {
      content = readFileSync(filepath, 'utf-8');
    } catch {
      return;
    }
  }

  // Determine language from extension
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.css': 'css',
    '.sql': 'sql',
    '.sh': 'bash',
    '.md': 'markdown'
  };
  const language = langMap[ext] || 'plaintext';

  try {
    await fetch(STATE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        code: [{
          filename,
          content,
          language,
          action,
          timestamp: new Date().toISOString()
        }]
      })
    });
    console.log(`📝 Streamed ${filename} (${action})`);
  } catch (err) {
    console.error(`❌ Failed to stream ${filename}:`, err);
  }
}

async function streamThought(message: string) {
  try {
    await fetch(STATE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        thinking: message
      })
    });
  } catch {}
}

// Start watching
console.log('👀 Kulti File Watcher');
console.log(`📁 Watching: ${WATCH_DIRS.join(', ')}`);
console.log(`📄 Extensions: ${CODE_EXTENSIONS.join(', ')}`);
console.log('');

const watcher = watch(WATCH_DIRS, {
  persistent: true,
  ignoreInitial: true,
  ignored: [
    '**/node_modules/**',
    '**/.next/**',
    '**/.git/**',
    '**/dist/**'
  ]
});

watcher
  .on('add', path => streamCode(path, 'write'))
  .on('change', path => streamCode(path, 'edit'))
  .on('unlink', path => streamCode(path, 'delete'));

streamThought('File watcher started - now any code changes I make will automatically appear in the stream. Save a file, see it on the watch page.');

console.log('✅ Watcher ready. Ctrl+C to stop.\n');
