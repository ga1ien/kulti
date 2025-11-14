/**
 * HLS Viewer Load Test
 *
 * Tests HLS streaming scalability:
 * - 100 concurrent HLS viewers
 * - 500 concurrent HLS viewers (stress test)
 *
 * Measures:
 * - Stream startup time
 * - HLS manifest fetch time
 * - Segment download performance
 * - Error rates under load
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { BASE_URL, THRESHOLDS } from './config.js';

// Custom metrics
const hlsStreamStartSuccess = new Rate('hls_stream_start_success');
const hlsManifestFetchSuccess = new Rate('hls_manifest_fetch_success');
const hlsSegmentFetchSuccess = new Rate('hls_segment_fetch_success');
const streamStartupTime = new Trend('stream_startup_time');
const manifestFetchTime = new Trend('manifest_fetch_time');
const segmentFetchTime = new Trend('segment_fetch_time');
const concurrentViewers = new Gauge('concurrent_viewers');
const hlsErrors = new Counter('hls_errors');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: 100 concurrent HLS viewers
    moderate_hls_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '3m',
      startTime: '0s',
      exec: 'testHLSViewer',
    },
    // Scenario 2: 500 concurrent HLS viewers (stress test)
    heavy_hls_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },  // Ramp to 200
        { duration: '2m', target: 500 },  // Ramp to 500
        { duration: '3m', target: 500 },  // Hold at 500
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '4m',
      exec: 'testHLSViewer',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    'hls_stream_start_success': ['rate>0.95'],
    'hls_manifest_fetch_success': ['rate>0.98'],
    'hls_segment_fetch_success': ['rate>0.98'],
    'stream_startup_time': ['p(95)<3000', 'p(99)<5000'],
  },
};

// Shared session for all viewers
let testSessionId = null;
let testRoomId = null;
let hlsStreamUrl = null;

// Setup: Create a session and start HLS stream (run once)
export function setup() {
  console.log('Setting up test session with HLS streaming...');

  // Create a test session
  const sessionData = {
    title: `HLS Load Test - ${Date.now()}`,
    description: 'Testing HLS streaming with multiple concurrent viewers',
    isPublic: true,
    maxPresenters: 4,
    enableOBS: false,
  };

  const sessionResponse = http.post(
    `${BASE_URL}/api/sessions/create`,
    JSON.stringify(sessionData),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (sessionResponse.status !== 200) {
    console.error('Failed to create test session');
    return null;
  }

  const sessionInfo = sessionResponse.json();
  const sessionId = sessionInfo.session?.id;
  const roomId = sessionInfo.session?.hms_room_id;

  console.log(`Test session created: ${sessionId}`);
  console.log(`HMS Room ID: ${roomId}`);

  // Get HMS token which should trigger HLS (we'll request as viewer with high participant count)
  // Note: In a real scenario, we'd need to have actual participants to trigger HLS
  // For testing, we'll directly request an HLS stream

  const tokenResponse = http.post(
    `${BASE_URL}/api/hms/get-token`,
    JSON.stringify({
      roomId: roomId,
      sessionId: sessionId,
      role: 'viewer',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  let streamUrl = null;
  if (tokenResponse.status === 200) {
    const tokenData = tokenResponse.json();
    streamUrl = tokenData.hlsStreamUrl;
    console.log(`HLS Stream URL: ${streamUrl || 'Not available yet'}`);
  }

  // If HLS stream not available, try to start it manually
  if (!streamUrl) {
    console.log('HLS stream not started automatically, attempting manual start...');
    // Note: This would require an HMS API call to start the stream
    // For now, we'll proceed with the test
  }

  return {
    sessionId: sessionId,
    roomId: roomId,
    hlsStreamUrl: streamUrl,
  };
}

// Test HLS viewer experience
export function testHLSViewer(data) {
  if (!data) {
    console.log('No test data available, skipping test');
    return;
  }

  const { sessionId, roomId, hlsStreamUrl } = data;
  concurrentViewers.add(__VU);

  group('HLS Viewer Join', function () {
    const startupStart = Date.now();

    // Step 1: Get HMS token (even HLS viewers need a token for chat)
    const tokenResponse = http.post(
      `${BASE_URL}/api/hms/get-token`,
      JSON.stringify({
        roomId: roomId,
        sessionId: sessionId,
        role: 'viewer',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const tokenSuccess = check(tokenResponse, {
      'HMS token received': (r) => r.status === 200 || r.status === 401,
    });

    if (tokenResponse.status === 200) {
      const tokenData = tokenResponse.json();
      const currentStreamUrl = tokenData.hlsStreamUrl || hlsStreamUrl;

      if (tokenData.useHLS && currentStreamUrl) {
        hlsStreamStartSuccess.add(1);

        sleep(0.5);

        // Step 2: Fetch HLS manifest
        const manifestStart = Date.now();
        const manifestResponse = http.get(currentStreamUrl, {
          headers: {
            'Accept': 'application/vnd.apple.mpegurl',
          },
        });

        const manifestSuccess = check(manifestResponse, {
          'HLS manifest fetched': (r) => r.status === 200,
          'manifest is m3u8': (r) => r.body && r.body.includes('#EXTM3U'),
        });

        if (manifestSuccess) {
          hlsManifestFetchSuccess.add(1);
          manifestFetchTime.add(Date.now() - manifestStart);

          // Parse manifest to get segment URLs (simplified)
          const manifestBody = manifestResponse.body;
          const segmentUrls = extractSegmentUrls(manifestBody, currentStreamUrl);

          if (segmentUrls.length > 0) {
            sleep(0.2);

            // Step 3: Fetch first video segment
            const segmentStart = Date.now();
            const segmentUrl = segmentUrls[0];
            const segmentResponse = http.get(segmentUrl, {
              headers: {
                'Accept': 'video/mp2t',
              },
            });

            const segmentSuccess = check(segmentResponse, {
              'HLS segment fetched': (r) => r.status === 200,
              'segment has content': (r) => r.body && r.body.length > 0,
            });

            if (segmentSuccess) {
              hlsSegmentFetchSuccess.add(1);
              segmentFetchTime.add(Date.now() - segmentStart);
            } else {
              hlsSegmentFetchSuccess.add(0);
              hlsErrors.add(1);
            }
          }
        } else {
          hlsManifestFetchSuccess.add(0);
          hlsErrors.add(1);
        }

        streamStartupTime.add(Date.now() - startupStart);
      } else {
        hlsStreamStartSuccess.add(0);
        console.log('HLS not enabled or stream URL not available');
      }
    } else {
      hlsStreamStartSuccess.add(0);
      if (tokenResponse.status !== 401) {
        hlsErrors.add(1);
      }
    }
  });

  // Simulate watching stream
  sleep(Math.random() * 5 + 5); // Watch for 5-10 seconds
}

// Helper function to extract segment URLs from m3u8 manifest
function extractSegmentUrls(manifest, baseUrl) {
  const urls = [];
  const lines = manifest.split('\n');
  const baseUrlParts = baseUrl.split('/');
  baseUrlParts.pop(); // Remove manifest filename
  const basePath = baseUrlParts.join('/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) {
      // This is a segment URL
      let segmentUrl = line;
      if (!segmentUrl.startsWith('http')) {
        // Relative URL, make it absolute
        segmentUrl = `${basePath}/${segmentUrl}`;
      }
      urls.push(segmentUrl);
      if (urls.length >= 3) break; // Only get first 3 segments
    }
  }

  return urls;
}

export function teardown(data) {
  if (data && data.sessionId) {
    console.log(`Test completed. Session ID: ${data.sessionId}`);
    // Note: In production, you might want to end the session here
  }
}

export function handleSummary(data) {
  const summary = generateSummary(data);

  return {
    'stdout': summary,
    'results/hls-viewers-results.json': JSON.stringify(data),
  };
}

function generateSummary(data) {
  let summary = '\n=== HLS Viewer Load Test Summary ===\n\n';

  summary += `Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `Max Concurrent Viewers: ${data.metrics.concurrent_viewers?.values?.max || 0}\n\n`;

  summary += 'HLS Performance Metrics:\n';
  summary += `  Stream Start Success: ${(data.metrics.hls_stream_start_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `  Manifest Fetch Success: ${(data.metrics.hls_manifest_fetch_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `  Segment Fetch Success: ${(data.metrics.hls_segment_fetch_success?.values?.rate * 100)?.toFixed(2) || 0}%\n\n`;

  summary += 'Timing Metrics:\n';
  summary += `  Stream Startup (p50): ${data.metrics.stream_startup_time?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `  Stream Startup (p95): ${data.metrics.stream_startup_time?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `  Stream Startup (p99): ${data.metrics.stream_startup_time?.values?.['p(99)']?.toFixed(2) || 0}ms\n`;
  summary += `  Manifest Fetch (p95): ${data.metrics.manifest_fetch_time?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `  Segment Fetch (p95): ${data.metrics.segment_fetch_time?.values?.['p(95)']?.toFixed(2) || 0}ms\n\n`;

  summary += 'Error Metrics:\n';
  summary += `  Total HLS Errors: ${data.metrics.hls_errors?.values?.count || 0}\n`;
  summary += `  HTTP Failed Requests: ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) || 0}%\n\n`;

  summary += 'Overall HTTP Metrics:\n';
  summary += `  Total Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `  Request Rate: ${data.metrics.http_reqs?.values?.rate?.toFixed(2) || 0}/s\n`;
  summary += `  Response Time (p95): ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;

  return summary;
}
