/**
 * Smoke Test - Quick validation of load testing setup
 *
 * This is a minimal test to verify the test infrastructure works
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './config.js';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  // Test basic API endpoint
  const response = http.get(`${BASE_URL}/`);

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
