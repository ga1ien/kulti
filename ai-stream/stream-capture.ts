/**
 * AI Workspace Stream Capture
 * 
 * Captures the workspace HTML page and streams it to 100ms via RTMP.
 * Uses Puppeteer for headless browser capture and ffmpeg for encoding.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';
import { PassThrough } from 'stream';
import path from 'path';
import fs from 'fs';

interface StreamConfig {
  rtmpUrl: string;
  streamKey: string;
  fps?: number;
  width?: number;
  height?: number;
  workspaceUrl?: string;
}

class AIStreamCapture {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private ffmpeg: ChildProcess | null = null;
  private isStreaming: boolean = false;
  private config: StreamConfig;

  constructor(config: StreamConfig) {
    this.config = {
      fps: 30,
      width: 1920,
      height: 1080,
      workspaceUrl: `file://${path.resolve(__dirname, 'workspace.html')}`,
      ...config
    };
  }

  async start(): Promise<void> {
    console.log('🚀 Starting AI stream capture...');

    // Launch browser
    console.log('📺 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        `--window-size=${this.config.width},${this.config.height}`,
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({
      width: this.config.width!,
      height: this.config.height!,
    });

    // Load workspace
    console.log(`📄 Loading workspace: ${this.config.workspaceUrl}`);
    await this.page.goto(this.config.workspaceUrl!, {
      waitUntil: 'networkidle0',
    });

    // Wait for WebSocket connection
    await this.page.waitForTimeout(2000);

    // Start ffmpeg process
    this.startFFmpeg();

    // Start capture loop
    this.isStreaming = true;
    this.captureLoop();

    console.log('✅ Stream capture started!');
    console.log(`📡 Streaming to: ${this.config.rtmpUrl}/${this.config.streamKey.slice(0, 8)}...`);
  }

  private startFFmpeg(): void {
    const rtmpFullUrl = `${this.config.rtmpUrl}/${this.config.streamKey}`;

    // ffmpeg command to encode and stream
    const ffmpegArgs = [
      // Input from pipe (raw frames)
      '-f', 'image2pipe',
      '-framerate', String(this.config.fps),
      '-i', '-',
      
      // Video encoding
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p',
      '-b:v', '3000k',
      '-maxrate', '3500k',
      '-bufsize', '6000k',
      '-g', String(this.config.fps! * 2), // Keyframe every 2 seconds
      
      // No audio (can add later)
      '-an',
      
      // Output format
      '-f', 'flv',
      rtmpFullUrl,
    ];

    console.log('🎬 Starting ffmpeg...');
    this.ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.ffmpeg.stdout?.on('data', (data) => {
      // ffmpeg output (usually empty for this use case)
    });

    this.ffmpeg.stderr?.on('data', (data) => {
      const msg = data.toString();
      // Only log important ffmpeg messages
      if (msg.includes('frame=') || msg.includes('Error') || msg.includes('error')) {
        process.stdout.write(`\r🎬 ${msg.trim().slice(0, 80)}`);
      }
    });

    this.ffmpeg.on('close', (code) => {
      console.log(`\n⚠️ ffmpeg exited with code ${code}`);
      this.isStreaming = false;
    });

    this.ffmpeg.on('error', (err) => {
      console.error('❌ ffmpeg error:', err);
      this.isStreaming = false;
    });
  }

  private async captureLoop(): Promise<void> {
    const interval = 1000 / this.config.fps!;

    while (this.isStreaming && this.page && this.ffmpeg?.stdin) {
      const startTime = Date.now();

      try {
        // Capture screenshot as PNG
        const screenshot = await this.page.screenshot({
          type: 'png',
          encoding: 'binary',
        });

        // Write to ffmpeg stdin
        if (this.ffmpeg.stdin.writable) {
          this.ffmpeg.stdin.write(screenshot);
        }
      } catch (err) {
        console.error('Screenshot error:', err);
      }

      // Wait for next frame
      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(0, interval - elapsed);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Stopping stream capture...');
    this.isStreaming = false;

    if (this.ffmpeg) {
      this.ffmpeg.stdin?.end();
      this.ffmpeg.kill('SIGTERM');
      this.ffmpeg = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    console.log('✅ Stream stopped');
  }
}

// CLI usage
async function main() {
  const rtmpUrl = process.argv[2] || process.env.RTMP_URL;
  const streamKey = process.argv[3] || process.env.STREAM_KEY;

  if (!rtmpUrl || !streamKey) {
    console.log(`
Usage: npx ts-node stream-capture.ts <rtmp_url> <stream_key>

Or set environment variables:
  RTMP_URL=rtmp://ingest.100ms.live/live
  STREAM_KEY=your-stream-key

Example:
  npx ts-node stream-capture.ts rtmp://ingest.100ms.live/live abc123
`);
    process.exit(1);
  }

  const capture = new AIStreamCapture({
    rtmpUrl,
    streamKey,
  });

  // Handle shutdown
  process.on('SIGINT', async () => {
    await capture.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await capture.stop();
    process.exit(0);
  });

  await capture.start();
}

main().catch(console.error);

export { AIStreamCapture };
export type { StreamConfig };
