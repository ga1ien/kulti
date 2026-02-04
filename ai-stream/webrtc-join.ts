/**
 * Join 100ms room via WebRTC as a bot presenter
 * Uses Puppeteer to join the room and share screen
 */

import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

const HMS_KEY = '691299afbd0dab5f9a0146b4';
const HMS_SECRET = 'WlzWwpY_kpagvhu47ylYRSz-AV7l6WDE3CiEjtJcBLPXAHMKPs9qm7FN3pAdyvWWPt1N6aRe_-r8SQq1p93htODeQgCpjkop7j-CwRFLnR2hkW8799ZhN3NQVN90mHz1xFPqq426iKeU4gzLIJb8E9edaN0zVIztGfkE1ztw3uw=';
const ROOM_ID = '6982aa93878a3b52c5b74e07';

import * as jwt from 'jsonwebtoken';

function generateAuthToken(): string {
  const payload = {
    access_key: HMS_KEY,
    room_id: ROOM_ID,
    user_id: 'nex-ai-streamer',
    role: 'host',
    type: 'app',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  return jwt.sign(payload, HMS_SECRET, { algorithm: 'HS256' });
}

async function main() {
  console.log('🚀 Starting WebRTC join...');
  
  const authToken = generateAuthToken();
  console.log('🎟️ Generated auth token');
  
  // Create a minimal HTML page that joins the 100ms room
  const joinHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Nex AI Stream</title>
  <script src="https://cdn.jsdelivr.net/npm/@100mslive/hms-video-store@0.12.26/dist/index.js"></script>
  <style>
    body { margin: 0; background: #1a1a1a; color: white; font-family: system-ui; }
    #status { padding: 20px; font-size: 18px; }
    video { width: 100%; height: 100vh; object-fit: contain; }
  </style>
</head>
<body>
  <div id="status">Initializing...</div>
  <video id="localVideo" autoplay muted></video>
  
  <script type="module">
    const { HMSReactiveStore } = HMSVideoStore;
    
    const hmsStore = new HMSReactiveStore();
    const hmsActions = hmsStore.getHMSActions();
    const status = document.getElementById('status');
    
    async function joinRoom() {
      try {
        status.textContent = 'Joining room...';
        
        await hmsActions.join({
          authToken: '${authToken}',
          userName: 'Nex AI',
          settings: {
            isAudioMuted: true,
            isVideoMuted: false
          }
        });
        
        status.textContent = 'Joined! Starting screen share...';
        
        // Wait for connection
        await new Promise(r => setTimeout(r, 2000));
        
        // Start screen share
        await hmsActions.setScreenShareEnabled(true);
        
        status.textContent = '🟢 Live - Screen sharing active';
        
      } catch (err) {
        status.textContent = '❌ Error: ' + err.message;
        console.error(err);
      }
    }
    
    joinRoom();
  </script>
</body>
</html>
  `.trim();
  
  const joinHtmlPath = path.join(__dirname, 'join-room.html');
  fs.writeFileSync(joinHtmlPath, joinHtml);
  console.log('📄 Created join page:', joinHtmlPath);
  
  // Launch browser with screen sharing permissions
  console.log('📺 Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--window-size=1920,1080',
      '--auto-select-desktop-capture-source=Nex Workspace',
      '--enable-usermedia-screen-capturing',
      '--allow-http-screen-capture',
      '--disable-gesture-requirement-for-media-playback',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });
  
  const page = await browser.newPage();
  
  // Grant permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('file://' + joinHtmlPath, [
    'camera',
    'microphone'
  ]);
  
  console.log('📄 Loading join page...');
  await page.goto(`file://${joinHtmlPath}`, { waitUntil: 'domcontentloaded' });
  
  // Wait and watch
  await new Promise(r => setTimeout(r, 5000));
  
  const status = await page.evaluate(() => document.getElementById('status')?.textContent);
  console.log('Status:', status);
  
  // Keep running
  console.log('✅ Bot running. Press Ctrl+C to stop.');
  await new Promise(() => {});
}

main().catch(console.error);
