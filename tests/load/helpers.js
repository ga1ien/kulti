/**
 * Load Testing Helper Functions
 *
 * Shared utilities for authentication, session management, etc.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './config.js';

/**
 * Authenticate a user and get session cookie
 * Note: This is a simplified version. Actual implementation depends on your auth system.
 */
export function authenticate(email, password) {
  // For Supabase auth, we'd need to get the access token
  // This is a placeholder - adjust based on your actual auth flow
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(`${BASE_URL}/api/auth/login`, payload, params);

  check(response, {
    'authentication successful': (r) => r.status === 200,
  });

  // Extract auth token/cookie from response
  // Adjust based on your auth implementation
  return response.cookies['sb-access-token'] || response.json('access_token');
}

/**
 * Create an authenticated request params object
 */
export function getAuthHeaders(authToken) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  };
}

/**
 * Create a test session
 */
export function createSession(authToken, sessionData) {
  const payload = JSON.stringify(sessionData);
  const params = getAuthHeaders(authToken);

  const response = http.post(`${BASE_URL}/api/sessions/create`, payload, params);

  check(response, {
    'session created': (r) => r.status === 200,
    'session has id': (r) => r.json('session.id') !== undefined,
  });

  return response.json('session');
}

/**
 * Join a session
 */
export function joinSession(authToken, sessionId) {
  const params = getAuthHeaders(authToken);

  const response = http.post(
    `${BASE_URL}/api/sessions/${sessionId}/join`,
    null,
    params
  );

  check(response, {
    'session joined': (r) => r.status === 200,
  });

  return response.json();
}

/**
 * Get HMS token for a session
 */
export function getHMSToken(authToken, roomId, sessionId, role = 'viewer') {
  const payload = JSON.stringify({
    roomId,
    sessionId,
    role,
  });
  const params = getAuthHeaders(authToken);

  const response = http.post(`${BASE_URL}/api/hms/get-token`, payload, params);

  const result = check(response, {
    'HMS token received': (r) => r.status === 200,
    'HMS token is valid': (r) => r.json('token') !== undefined,
  });

  return {
    success: result,
    data: response.json(),
  };
}

/**
 * Get HLS stream (for high viewer count scenarios)
 */
export function getHLSStream(authToken, roomId, sessionId) {
  const result = getHMSToken(authToken, roomId, sessionId, 'viewer');

  if (result.success && result.data.useHLS) {
    check(result.data, {
      'HLS enabled': (d) => d.useHLS === true,
      'HLS stream URL provided': (d) => d.hlsStreamUrl !== null,
    });
  }

  return result.data;
}

/**
 * Check credits balance
 */
export function checkCreditsBalance(authToken) {
  const params = getAuthHeaders(authToken);

  const response = http.get(`${BASE_URL}/api/credits/balance`, params);

  check(response, {
    'credits balance retrieved': (r) => r.status === 200,
  });

  return response.json();
}

/**
 * List recordings
 */
export function listRecordings(authToken) {
  const params = getAuthHeaders(authToken);

  const response = http.get(`${BASE_URL}/api/recordings/list`, params);

  check(response, {
    'recordings list retrieved': (r) => r.status === 200,
  });

  return response.json();
}

/**
 * Start recording
 */
export function startRecording(authToken, roomId, sessionId) {
  const payload = JSON.stringify({
    roomId,
    sessionId,
  });
  const params = getAuthHeaders(authToken);

  const response = http.post(`${BASE_URL}/api/hms/start-recording`, payload, params);

  check(response, {
    'recording started': (r) => r.status === 200,
  });

  return response.json();
}

/**
 * Stop recording
 */
export function stopRecording(authToken, roomId, recordingId) {
  const payload = JSON.stringify({
    roomId,
    recordingId,
  });
  const params = getAuthHeaders(authToken);

  const response = http.post(`${BASE_URL}/api/hms/stop-recording`, payload, params);

  check(response, {
    'recording stopped': (r) => r.status === 200,
  });

  return response.json();
}

/**
 * Simulate user think time
 */
export function thinkTime(min = 1, max = 3) {
  sleep(Math.random() * (max - min) + min);
}

/**
 * Generate random user from test users pool
 */
export function getRandomUser(users) {
  return users[Math.floor(Math.random() * users.length)];
}
