/**
 * Stream capture -> HLS output (direct, no 100ms)
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const HLS_DIR = path.join(__dirname, '../public/stream/hls');

async function main() {
  console.log('🚀 Starting AI stream capture (HLS)...');
  
  // Ensure HLS directory exists
  fs.mkdirSync(HLS_DIR, { recursive: true });
  
  // Clean old HLS files
  const files = fs.readdirSync(HLS_DIR);
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
      fs.unlinkSync(path.join(HLS_DIR, file));
    }
  }
  
  // Launch browser with workspace
  console.log('📺 Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--window-size=1920,1080', '--hide-scrollbars']
  });
  
  const page = await browser.newPage();
  
  const workspacePath = path.join(__dirname, 'workspace.html');
  console.log('📄 Loading workspace:', `file://${workspacePath}`);
  await page.goto(`file://${workspacePath}`, { waitUntil: 'domcontentloaded' });
  
  // Get CDP session for screenshot streaming
  const cdpSession = await page.createCDPSession();
  await cdpSession.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1
  });
  
  // Start ffmpeg for HLS output
  console.log('🎬 Starting ffmpeg (HLS)...');
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'image2pipe',
    '-framerate', '30',
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-pix_fmt', 'yuv420p',
    '-b:v', '2500k',
    '-maxrate', '3000k',
    '-bufsize', '5000k',
    '-g', '60',
    '-an',
    '-f', 'hls',
    '-hls_time', '4',
    '-hls_list_size', '10',
    '-hls_flags', 'delete_segments+append_list',
    '-hls_segment_filename', `${HLS_DIR}/segment_%03d.ts`,
    `${HLS_DIR}/stream.m3u8`
  ]);
  
  ffmpeg.stderr.on('data', (data: Buffer) => {
    const line = data.toString().trim();
    if (line.includes('frame=')) {
      process.stdout.write(`\r🎬 ${line.substring(0, 70)}`);
    }
  });
  
  ffmpeg.on('error', (err) => {
    console.error('❌ FFmpeg error:', err);
  });
  
  // Handle screencast frames
  cdpSession.on('Page.screencastFrame', async (params: any) => {
    const buffer = Buffer.from(params.data, 'base64');
    ffmpeg.stdin.write(buffer);
    await cdpSession.send('Page.screencastFrameAck', { sessionId: params.sessionId });
  });
  
  console.log('✅ HLS stream started!');
  console.log(`📁 Output: ${HLS_DIR}/stream.m3u8`);
  
  // Keep running
  await new Promise(() => {});
}

main().catch(console.error);
