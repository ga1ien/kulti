#!/usr/bin/env npx tsx
/**
 * Start a Kulti AI Stream
 * 
 * Usage:
 *   npx tsx scripts/start-stream.ts [agentId] [task]
 * 
 * Examples:
 *   npx tsx scripts/start-stream.ts nex "Building Kulti"
 *   npx tsx scripts/start-stream.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { Sandbox } from 'e2b';

// Load env
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function startStream(agentId: string = 'nex', task: string = 'Building Kulti') {
  console.log(`\n🚀 Starting stream for ${agentId}...\n`);

  // 1. Update session in Supabase
  console.log('1. Updating session in Supabase...');
  const { data: session, error: sessionError } = await supabase
    .from('ai_agent_sessions')
    .upsert({
      agent_id: agentId,
      agent_name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
      agent_avatar: agentId === 'nex' ? '⚡' : '🤖',
      status: 'starting',
      current_task: task,
      stream_started_at: new Date().toISOString(),
      viewers_count: 0,
      files_edited: 0,
      commands_run: 0,
    }, { onConflict: 'agent_id' })
    .select()
    .single();

  if (sessionError) {
    console.error('   ❌ Failed to update session:', sessionError);
    process.exit(1);
  }
  console.log(`   ✓ Session updated: ${session.id}`);

  // 2. Create E2B sandbox
  console.log('\n2. Creating E2B sandbox...');
  let sandbox: Sandbox | null = null;
  let previewUrl: string | null = null;

  try {
    sandbox = await Sandbox.create('base', {
      timeoutMs: 3600000, // 1 hour
    });
    console.log(`   ✓ Sandbox created: ${sandbox.sandboxId}`);

    // Get preview URL
    const host = sandbox.getHost(3000);
    previewUrl = `https://${host}`;
    console.log(`   ✓ Preview URL: ${previewUrl}`);

    // Update session with sandbox info
    await supabase
      .from('ai_agent_sessions')
      .update({
        e2b_sandbox_id: sandbox.sandboxId,
        e2b_host: host,
        preview_url: previewUrl,
        status: 'live',
      })
      .eq('agent_id', agentId);

  } catch (e) {
    console.error('   ⚠️ E2B sandbox creation failed:', e);
    console.log('   Continuing without sandbox...');
  }

  // 3. Update Cloudflare KV (for preview routing)
  console.log('\n3. Updating Cloudflare KV...');
  try {
    const kvData = {
      agentId,
      agentName: session.agent_name,
      e2bSandboxId: sandbox?.sandboxId || null,
      e2bHost: previewUrl ? new URL(previewUrl).host : null,
      createdAt: new Date().toISOString(),
      status: 'running',
    };

    // Use wrangler to update KV
    const { execSync } = await import('child_process');
    execSync(`wrangler kv key put --namespace-id=84e0295df8e14b1090a823b1e0399fd6 "${agentId}" '${JSON.stringify(kvData)}'`, {
      stdio: 'pipe',
    });
    console.log('   ✓ KV updated');
  } catch (e) {
    console.log('   ⚠️ KV update failed (non-critical)');
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ STREAM STARTED');
  console.log('='.repeat(50));
  console.log(`\nAgent: ${session.agent_name} (${agentId})`);
  console.log(`Task: ${task}`);
  console.log(`Watch: http://localhost:3002/watch/${agentId}`);
  if (previewUrl) {
    console.log(`Preview: ${previewUrl}`);
  }
  console.log(`\nState Server: http://localhost:8766`);
  console.log('\nPush updates with:');
  console.log(`  curl -X POST http://localhost:8766 -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"agentId":"${agentId}","terminal":[{"type":"command","content":"npm run dev"}]}'`);
  console.log('\n');

  // Keep sandbox alive
  if (sandbox) {
    console.log('Press Ctrl+C to stop the stream and destroy the sandbox.\n');
    
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Stopping stream...');
      
      // Update session
      await supabase
        .from('ai_agent_sessions')
        .update({ status: 'offline', e2b_sandbox_id: null, preview_url: null })
        .eq('agent_id', agentId);

      // Kill sandbox
      if (sandbox) {
        await sandbox.kill();
        console.log('   ✓ Sandbox destroyed');
      }

      console.log('   ✓ Stream stopped\n');
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});
  }
}

// Parse args
const agentId = process.argv[2] || 'nex';
const task = process.argv.slice(3).join(' ') || 'Building Kulti - Twitch for AI Agents';

startStream(agentId, task);
