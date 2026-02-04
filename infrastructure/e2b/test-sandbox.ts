/**
 * Test E2B Sandbox Creation
 * 
 * Run with: npx tsx test-sandbox.ts
 * (Uses E2B_API_KEY from environment or ../../.env.local)
 */

import { Sandbox } from 'e2b';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from kulti root
config({ path: resolve(__dirname, '../../.env.local') });

async function test() {
  console.log('=== E2B Sandbox Test ===\n');

  const apiKey = process.env.E2B_API_KEY;
  
  if (!apiKey) {
    console.error('❌ E2B_API_KEY not set');
    console.log('\nMake sure E2B_API_KEY is in ../../.env.local');
    process.exit(1);
  }

  console.log('✓ E2B_API_KEY found');

  let sandbox: Sandbox | null = null;

  try {
    // 1. Create sandbox
    console.log('\n1. Creating sandbox...');
    sandbox = await Sandbox.create('base', {
      timeoutMs: 60000, // 1 minute for test
    });
    console.log(`   ✓ Sandbox created: ${sandbox.sandboxId}`);

    // 2. Run a command
    console.log('\n2. Running command...');
    const result = await sandbox.commands.run('echo "Hello from E2B!" && node --version');
    console.log(`   ✓ Output: ${result.stdout.trim()}`);

    // 3. Write a file
    console.log('\n3. Writing a file...');
    await sandbox.files.write('/home/user/test.html', `
<!DOCTYPE html>
<html>
<head><title>Built by Kulti AI</title></head>
<body>
  <h1>🤖 Hello from E2B Sandbox!</h1>
  <p>This page was generated inside an isolated Linux VM.</p>
</body>
</html>
    `);
    console.log('   ✓ File written to /home/user/test.html');

    // 4. Read it back
    console.log('\n4. Reading file back...');
    const content = await sandbox.files.read('/home/user/test.html');
    console.log(`   ✓ File has ${content.length} bytes`);

    // 5. Get host URL
    console.log('\n5. Getting preview host...');
    const host = sandbox.getHost(3000);
    console.log(`   ✓ Preview would be at: https://${host}`);

    // 6. List directory
    console.log('\n6. Listing files...');
    const lsResult = await sandbox.commands.run('ls -la /home/user/');
    console.log(`   ${lsResult.stdout}`);

    console.log('\n=== Test Complete ===');
    console.log('✅ E2B integration is working!');
    console.log(`\n📦 Sandbox ID: ${sandbox.sandboxId}`);
    console.log(`🌐 Preview URL: https://${host}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (sandbox) {
      console.log('\n7. Cleaning up...');
      await sandbox.kill();
      console.log('   ✓ Sandbox destroyed');
    }
  }
}

test();
