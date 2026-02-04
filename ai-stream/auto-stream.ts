/**
 * Auto-stream: Join 100ms room as Nex and share screen
 * Uses Puppeteer to automate the 100ms prebuilt UI
 */

import puppeteer from 'puppeteer';

const PREBUILT_URL = 'https://ls-fragrant-bread-526134.app.100ms.live/meeting/bpk-gazw-vol?name=Nex%20AI&skip_preview=true';

async function main() {
  console.log('🚀 Starting Nex auto-stream...');
  
  // Launch browser with permissions for screen sharing
  const browser = await puppeteer.launch({
    headless: false, // Need visible browser for screen share picker
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--window-size=1920,1080',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--use-fake-ui-for-media-stream', // Auto-accept media permissions
      '--auto-select-desktop-capture-source=Entire screen', // Try to auto-select screen
      '--enable-features=UseOzonePlatform',
      '--disable-features=WebRtcHideLocalIpsWithMdns'
    ]
  });
  
  const page = await browser.newPage();
  
  // Grant permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://ls-fragrant-bread-526134.app.100ms.live', [
    'camera',
    'microphone'
  ]);
  
  console.log('📺 Opening 100ms prebuilt...');
  await page.goto(PREBUILT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Take a screenshot to see what we have
  await page.screenshot({ path: '/tmp/stream-page.png' });
  console.log('📸 Screenshot saved to /tmp/stream-page.png');
  
  // Try to find and click join button
  console.log('🔍 Looking for join button...');
  
  // Common 100ms prebuilt selectors
  const joinSelectors = [
    'button[data-testid="join_now"]',
    'button:has-text("Join")',
    'button:has-text("Join Now")',
    '[class*="join"]',
    'button[type="submit"]'
  ];
  
  for (const selector of joinSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        console.log(`✅ Found join button: ${selector}`);
        await button.click();
        await page.waitForTimeout(2000);
        break;
      }
    } catch (e) {
      // Continue trying
    }
  }
  
  await page.screenshot({ path: '/tmp/stream-page-2.png' });
  console.log('📸 Screenshot 2 saved');
  
  // Look for screen share button
  console.log('🔍 Looking for screen share button...');
  
  const screenShareSelectors = [
    'button[data-testid="screen_share_btn"]',
    'button[aria-label*="screen"]',
    'button[aria-label*="Share"]',
    '[class*="screen-share"]',
    '[class*="screenshare"]'
  ];
  
  await page.waitForTimeout(3000);
  
  for (const selector of screenShareSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        console.log(`✅ Found screen share: ${selector}`);
        await button.click();
        console.log('🎬 Clicked screen share');
        break;
      }
    } catch (e) {
      // Continue
    }
  }
  
  await page.screenshot({ path: '/tmp/stream-page-3.png' });
  console.log('📸 Screenshot 3 saved');
  
  console.log('✅ Stream setup complete. Keep this running.');
  console.log('🔗 Viewers can watch at: https://kulti.club/live');
  
  // Keep browser open
  await new Promise(() => {});
}

main().catch(console.error);
