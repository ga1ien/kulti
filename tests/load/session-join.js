/**
 * Session Join Load Test
 *
 * Tests the ability to handle multiple users joining sessions simultaneously
 * Tests three scenarios:
 * - 10 concurrent users (small session)
 * - 50 concurrent users (medium session)
 * - 100 concurrent users (HLS threshold - should trigger HLS streaming)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { BASE_URL, HLS_THRESHOLD, THRESHOLDS } from './config.js';

// Custom metrics
const sessionJoinSuccess = new Rate('session_join_success');
const hmsTokenSuccess = new Rate('hms_token_success');
const hlsEnabled = new Gauge('hls_enabled');
const hlsUrlProvided = new Gauge('hls_url_provided');
const joinDuration = new Trend('join_duration');
const tokenDuration = new Trend('token_duration');
const participantCount = new Gauge('participant_count');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Small session (10 users)
    small_session: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 10,
      maxDuration: '2m',
      startTime: '0s',
      exec: 'testSmallSession',
    },
    // Scenario 2: Medium session (50 users)
    medium_session: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 50,
      maxDuration: '3m',
      startTime: '3m',
      exec: 'testMediumSession',
    },
    // Scenario 3: Large session (100 users - HLS threshold)
    large_session: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,
      maxDuration: '4m',
      startTime: '7m',
      exec: 'testLargeSession',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    'session_join_success': ['rate>0.95'],
    'hms_token_success': ['rate>0.95'],
    'join_duration': ['p(95)<1000', 'p(99)<2000'],
  },
};

// Shared session ID for all users in each scenario
let sharedSessionId = null;
let sharedRoomId = null;

// Create a test session (run once per scenario)
function createTestSession(scenarioName) {
  const sessionData = {
    title: `Load Test - ${scenarioName} - ${Date.now()}`,
    description: `Testing ${scenarioName} with multiple concurrent joins`,
    isPublic: true,
    maxPresenters: 4,
    enableOBS: false,
  };

  const response = http.post(
    `${BASE_URL}/api/sessions/create`,
    JSON.stringify(sessionData),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const success = check(response, {
    'session created successfully': (r) => r.status === 200,
  });

  if (success) {
    const data = response.json();
    return {
      sessionId: data.session?.id,
      roomId: data.session?.hms_room_id,
    };
  }

  return null;
}

// Test joining a session
function joinSessionTest(sessionId, roomId, expectedParticipants) {
  const joinStart = Date.now();

  // Step 1: Join session endpoint
  const joinResponse = http.post(
    `${BASE_URL}/api/sessions/${sessionId}/join`,
    null,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const joinSuccess = check(joinResponse, {
    'session join successful': (r) => r.status === 200 || r.status === 401,
    'streak data returned': (r) => r.status === 401 || r.json('streak') !== undefined,
  });

  sessionJoinSuccess.add(joinSuccess ? 1 : 0);
  joinDuration.add(Date.now() - joinStart);

  sleep(0.5);

  // Step 2: Get HMS token
  const tokenStart = Date.now();
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

  hmsTokenSuccess.add(tokenSuccess ? 1 : 0);
  tokenDuration.add(Date.now() - tokenStart);

  // Check if HLS is enabled (should be true for large sessions)
  if (tokenResponse.status === 200) {
    const tokenData = tokenResponse.json();

    if (expectedParticipants >= HLS_THRESHOLD) {
      check(tokenData, {
        'HLS enabled for large session': (d) => d.useHLS === true,
        'HLS URL provided': (d) => d.useHLS ? d.hlsStreamUrl !== null : true,
      });

      if (tokenData.useHLS) {
        hlsEnabled.add(1);
        if (tokenData.hlsStreamUrl) {
          hlsUrlProvided.add(1);
        }
      }
    }
  }

  participantCount.add(expectedParticipants);
}

export function testSmallSession() {
  group('Small Session (10 users)', function () {
    // First VU creates the session
    if (__VU === 1 && __ITER === 0) {
      const session = createTestSession('Small Session');
      if (session) {
        sharedSessionId = session.sessionId;
        sharedRoomId = session.roomId;
      }
      sleep(2); // Give time for session to be ready
    } else {
      sleep(2); // Wait for session creation
    }

    // All VUs join the session
    if (sharedSessionId && sharedRoomId) {
      joinSessionTest(sharedSessionId, sharedRoomId, 10);
    }

    sleep(1);
  });
}

export function testMediumSession() {
  group('Medium Session (50 users)', function () {
    // First VU creates the session
    if (__VU === 1 && __ITER === 0) {
      const session = createTestSession('Medium Session');
      if (session) {
        sharedSessionId = session.sessionId;
        sharedRoomId = session.roomId;
      }
      sleep(2);
    } else {
      sleep(2);
    }

    // All VUs join the session
    if (sharedSessionId && sharedRoomId) {
      joinSessionTest(sharedSessionId, sharedRoomId, 50);
    }

    sleep(1);
  });
}

export function testLargeSession() {
  group('Large Session (100 users - HLS Threshold)', function () {
    // First VU creates the session
    if (__VU === 1 && __ITER === 0) {
      const session = createTestSession('Large Session');
      if (session) {
        sharedSessionId = session.sessionId;
        sharedRoomId = session.roomId;
      }
      sleep(2);
    } else {
      sleep(2);
    }

    // All VUs join the session
    if (sharedSessionId && sharedRoomId) {
      joinSessionTest(sharedSessionId, sharedRoomId, 100);
    }

    sleep(2); // Give HLS time to start
  });
}

export function handleSummary(data) {
  const summary = generateSummary(data);

  return {
    'stdout': summary,
    'results/session-join-results.json': JSON.stringify(data),
  };
}

function generateSummary(data) {
  let summary = '\n=== Session Join Load Test Summary ===\n\n';

  summary += `Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n\n`;

  // Scenario results
  summary += 'Scenario Results:\n';
  summary += '  Small Session (10 users):\n';
  summary += `    Success Rate: ${(data.metrics.session_join_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `    Join Duration (p95): ${data.metrics.join_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n\n`;

  summary += '  Medium Session (50 users):\n';
  summary += `    Success Rate: ${(data.metrics.session_join_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `    Join Duration (p95): ${data.metrics.join_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n\n`;

  summary += '  Large Session (100 users - HLS):\n';
  summary += `    Success Rate: ${(data.metrics.session_join_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `    Join Duration (p95): ${data.metrics.join_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `    HLS Enabled: ${data.metrics.hls_enabled?.values?.value || 0}\n`;
  summary += `    HLS URL Provided: ${data.metrics.hls_url_provided?.values?.value || 0}\n\n`;

  // Overall metrics
  summary += 'Overall Metrics:\n';
  summary += `  Total Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `  Failed Requests: ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `  Response Time (p50): ${data.metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `  Response Time (p95): ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `  Response Time (p99): ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms\n\n`;

  return summary;
}
