/**
 * Test script to simulate state updates
 * Run this after starting the state-server to see the workspace update in real-time
 */

const API_URL = 'http://localhost:8766';

async function post(endpoint: string, data: any) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('🎬 Starting demo sequence...\n');

  // Set initial task
  await post('/state', {
    task: {
      title: 'Building AI streaming infrastructure',
      description: 'Creating the first live AI stream on Kulti',
      status: 'working'
    },
    status: 'Working',
    thinking: `
      <p>
        Starting the <span class="highlight">AI streaming demo</span>. 
        This is what my thinking looks like in real-time.
      </p>
      <p>
        Viewers can see my reasoning process as I work through problems.
      </p>
    `
  });
  console.log('✓ Set initial state');
  await delay(2000);

  // Add terminal commands
  await post('/terminal', { type: 'command', content: 'cd ~/development/kulti' });
  await delay(500);
  await post('/terminal', { type: 'output', content: '~/development/kulti' });
  await delay(1000);

  await post('/terminal', { type: 'command', content: 'git status' });
  await delay(500);
  await post('/terminal', { type: 'output', content: 'On branch main' });
  await post('/terminal', { type: 'output', content: 'Changes not staged for commit:' });
  await post('/terminal', { type: 'output', content: '  modified:   ai-stream/workspace.html' });
  await post('/terminal', { type: 'output', content: '  modified:   ai-stream/state-server.ts' });
  console.log('✓ Added terminal commands');
  await delay(2000);

  // Update thinking
  await post('/thinking', {
    content: `
      <p>
        Looking at the git status. I've modified the <span class="highlight">workspace renderer</span> 
        and the <span class="highlight">state server</span>.
      </p>
      <p>
        Next I'll commit these changes and test the RTMP stream...
      </p>
      <p class="dim">
        The stream capture uses Puppeteer to screenshot the workspace at 30fps, 
        then pipes to ffmpeg for RTMP encoding.
      </p>
    `
  });
  console.log('✓ Updated thinking');
  await delay(2000);

  // More terminal activity
  await post('/terminal', { type: 'command', content: 'npm install puppeteer ws' });
  await delay(500);
  await post('/terminal', { type: 'output', content: 'added 52 packages in 3s' });
  await post('/terminal', { type: 'success', content: '✓ Dependencies installed' });
  await delay(1000);

  await post('/terminal', { type: 'command', content: 'npm run state-server' });
  await delay(500);
  await post('/terminal', { type: 'success', content: '✓ State server running on :8765' });
  await delay(1500);

  // Update status
  await post('/state', {
    status: 'Testing',
    stats: { files: 5, commands: 8 }
  });
  console.log('✓ Updated stats');
  await delay(2000);

  // Final thinking
  await post('/thinking', {
    content: `
      <p>
        <span class="highlight">Infrastructure is ready!</span> 
      </p>
      <p>
        The state server is running. Now I can push updates from OpenClaw 
        and they'll appear in the workspace in real-time.
      </p>
      <p>
        <strong>Next steps:</strong>
      </p>
      <p>
        1. Create a Kulti session<br>
        2. Get the RTMP stream key<br>
        3. Start the capture pipeline<br>
        4. Go live! 🚀
      </p>
    `
  });

  await post('/state', { status: 'Ready' });
  console.log('✓ Demo complete!\n');
  console.log('Open workspace.html in a browser to see the result.');
}

runDemo().catch(console.error);
