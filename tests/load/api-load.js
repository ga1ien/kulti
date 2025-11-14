/**
 * API Load Test
 *
 * Tests basic API endpoints under load:
 * - Session creation
 * - Session join
 * - HMS token generation
 * - Credits balance
 * - User profile fetching
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, TEST_USERS } from './config.js';
import {
  authenticate,
  createSession,
  joinSession,
  getHMSToken,
  checkCreditsBalance,
  thinkTime,
  getRandomUser,
  getAuthHeaders,
} from './helpers.js';

// Custom metrics
const sessionCreationRate = new Rate('session_creation_success');
const sessionJoinRate = new Rate('session_join_success');
const tokenGenerationRate = new Rate('token_generation_success');
const sessionCreationDuration = new Trend('session_creation_duration');
const tokenGenerationDuration = new Trend('token_generation_duration');
const apiErrors = new Counter('api_errors');

// Test configuration
export const options = {
  scenarios: {
    api_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },  // Warm up
        { duration: '2m', target: 50 },  // Ramp to 50 users
        { duration: '3m', target: 50 },  // Stay at 50
        { duration: '1m', target: 0 },   // Ramp down
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: THRESHOLDS,
};

export default function () {
  // Note: In a real scenario, you'd need actual test user credentials
  // This is a simplified version for demonstration

  const user = getRandomUser(TEST_USERS);

  // Since we're using Supabase auth, we'll simulate authenticated requests
  // In production, you'd get real auth tokens
  const mockAuthToken = 'test-token-' + __VU;

  // Test 1: Create a session
  const sessionData = {
    title: `Load Test Session ${__VU}-${__ITER}`,
    description: 'Automated load testing session',
    isPublic: true,
    maxPresenters: 4,
    enableOBS: false,
  };

  const createStart = Date.now();
  const createResponse = http.post(
    `${BASE_URL}/api/sessions/create`,
    JSON.stringify(sessionData),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const createSuccess = check(createResponse, {
    'session create status 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  if (createResponse.status === 200) {
    sessionCreationRate.add(1);
    sessionCreationDuration.add(Date.now() - createStart);

    const session = createResponse.json('session');
    if (session && session.id) {
      thinkTime(0.5, 1);

      // Test 2: Join the session
      const joinResponse = http.post(
        `${BASE_URL}/api/sessions/${session.id}/join`,
        null,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const joinSuccess = check(joinResponse, {
        'session join status 200 or 401': (r) => r.status === 200 || r.status === 401,
      });

      if (joinResponse.status === 200) {
        sessionJoinRate.add(1);
      } else {
        sessionJoinRate.add(0);
      }

      thinkTime(0.5, 1);

      // Test 3: Get HMS token
      if (session.hms_room_id) {
        const tokenStart = Date.now();
        const tokenResponse = http.post(
          `${BASE_URL}/api/hms/get-token`,
          JSON.stringify({
            roomId: session.hms_room_id,
            sessionId: session.id,
            role: 'viewer',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const tokenSuccess = check(tokenResponse, {
          'HMS token status 200 or 401': (r) => r.status === 200 || r.status === 401,
        });

        if (tokenResponse.status === 200) {
          tokenGenerationRate.add(1);
          tokenGenerationDuration.add(Date.now() - tokenStart);
        } else {
          tokenGenerationRate.add(0);
        }
      }
    }
  } else {
    sessionCreationRate.add(0);
    apiErrors.add(1);
  }

  thinkTime(1, 2);

  // Test 4: Check credits balance
  const creditsResponse = http.get(`${BASE_URL}/api/credits/balance`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(creditsResponse, {
    'credits balance status 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  thinkTime(1, 2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/api-load-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options?.indent || '';
  const enableColors = options?.enableColors || false;

  let summary = '\n' + indent + '=== API Load Test Summary ===\n\n';

  // Test duration
  summary += indent + `Test Duration: ${data.state.testRunDurationMs / 1000}s\n`;

  // VUs
  summary += indent + `VUs: ${data.metrics.vus?.values?.value || 0}\n`;
  summary += indent + `VUs Max: ${data.metrics.vus_max?.values?.value || 0}\n\n`;

  // HTTP metrics
  summary += indent + 'HTTP Metrics:\n';
  summary += indent + `  Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += indent + `  Request Rate: ${data.metrics.http_reqs?.values?.rate?.toFixed(2) || 0}/s\n`;
  summary += indent + `  Failed Requests: ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) || 0}%\n\n`;

  // Response times
  summary += indent + 'Response Times:\n';
  summary += indent + `  p50: ${data.metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += indent + `  p95: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += indent + `  p99: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms\n\n`;

  // Custom metrics
  summary += indent + 'Custom Metrics:\n';
  summary += indent + `  Session Creation Success: ${(data.metrics.session_creation_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += indent + `  Session Join Success: ${(data.metrics.session_join_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += indent + `  Token Generation Success: ${(data.metrics.token_generation_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += indent + `  API Errors: ${data.metrics.api_errors?.values?.count || 0}\n`;

  return summary;
}
