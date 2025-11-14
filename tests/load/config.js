/**
 * Load Testing Configuration
 *
 * Central configuration for all load tests
 */

// Base URL for the application
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

// Test user credentials (these should be pre-created in your test environment)
export const TEST_USERS = [
  { email: 'loadtest1@example.com', password: 'TestPassword123!' },
  { email: 'loadtest2@example.com', password: 'TestPassword123!' },
  { email: 'loadtest3@example.com', password: 'TestPassword123!' },
  { email: 'loadtest4@example.com', password: 'TestPassword123!' },
  { email: 'loadtest5@example.com', password: 'TestPassword123!' },
];

// Performance thresholds
export const THRESHOLDS = {
  // HTTP request duration thresholds
  http_req_duration: [
    'p(50)<200',   // 50th percentile under 200ms
    'p(95)<500',   // 95th percentile under 500ms
    'p(99)<1000',  // 99th percentile under 1000ms
  ],
  // Error rate threshold
  http_req_failed: ['rate<0.01'], // Less than 1% errors
  // Check success rate
  checks: ['rate>0.95'], // More than 95% of checks should pass
};

// HLS threshold (when to switch to HLS streaming)
export const HLS_THRESHOLD = parseInt(__ENV.HLS_THRESHOLD || '100', 10);

// Test scenarios configuration
export const SCENARIOS = {
  // Small session: 10 concurrent users
  small_session: {
    executor: 'constant-vus',
    vus: 10,
    duration: '2m',
    gracefulStop: '30s',
  },
  // Medium session: Ramp up to 50 users
  medium_session: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 50 },  // Ramp up to 50 users
      { duration: '2m', target: 50 },  // Stay at 50 users
      { duration: '1m', target: 0 },   // Ramp down
    ],
    gracefulStop: '30s',
  },
  // Large session: Test HLS threshold (100 users)
  large_session_hls: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 }, // Ramp up to 100 users
      { duration: '3m', target: 100 }, // Stay at 100 users
      { duration: '1m', target: 0 },   // Ramp down
    ],
    gracefulStop: '30s',
  },
  // Stress test: 500 concurrent viewers
  stress_test: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 200 },  // Ramp up to 200 users
      { duration: '5m', target: 500 },  // Scale to 500 users
      { duration: '2m', target: 500 },  // Stay at 500 users
      { duration: '2m', target: 0 },    // Ramp down
    ],
    gracefulStop: '30s',
  },
};

// API endpoints
export const ENDPOINTS = {
  SESSION_CREATE: '/api/sessions/create',
  SESSION_JOIN: '/api/sessions/{sessionId}/join',
  HMS_TOKEN: '/api/hms/get-token',
  CREDITS_BALANCE: '/api/credits/balance',
  INVITE_VALIDATE: '/api/invites/validate',
  RECORDING_LIST: '/api/recordings/list',
  RECORDING_START: '/api/hms/start-recording',
  RECORDING_STOP: '/api/hms/stop-recording',
};

// Test data generators
export function generateSessionData() {
  return {
    title: `Load Test Session ${Date.now()}`,
    description: 'Automated load testing session',
    isPublic: true,
    maxPresenters: 4,
    enableOBS: false,
  };
}

export function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
