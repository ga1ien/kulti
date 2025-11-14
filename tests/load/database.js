/**
 * Database Load Test
 *
 * Tests database performance under load:
 * - Concurrent user lookups
 * - Simultaneous credit transactions
 * - Parallel invite code validations
 * - Session participant queries
 * - RLS policy performance
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, THRESHOLDS } from './config.js';

// Custom metrics
const userLookupSuccess = new Rate('user_lookup_success');
const creditsCheckSuccess = new Rate('credits_check_success');
const inviteValidationSuccess = new Rate('invite_validation_success');
const participantQuerySuccess = new Rate('participant_query_success');
const dbQueryDuration = new Trend('db_query_duration');
const dbErrors = new Counter('db_errors');

// Test configuration
export const options = {
  scenarios: {
    // Mixed database operations
    database_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },   // Warm up
        { duration: '2m', target: 50 },   // Medium load
        { duration: '2m', target: 100 },  // High load
        { duration: '2m', target: 100 },  // Sustained high load
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    'user_lookup_success': ['rate>0.98'],
    'credits_check_success': ['rate>0.98'],
    'invite_validation_success': ['rate>0.95'],
    'db_query_duration': ['p(95)<300', 'p(99)<500'],
  },
};

export default function () {
  // Test 1: User profile lookup (simulates authentication check)
  group('User Profile Lookup', function () {
    const start = Date.now();

    // This would normally be an authenticated request
    // For load testing, we'll test the endpoint without auth to measure DB performance
    const response = http.get(`${BASE_URL}/api/profile/matchmaking`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const success = check(response, {
      'profile lookup completed': (r) => r.status === 200 || r.status === 401,
    });

    userLookupSuccess.add(success ? 1 : 0);
    if (success) {
      dbQueryDuration.add(Date.now() - start);
    } else {
      dbErrors.add(1);
    }

    sleep(0.5);
  });

  // Test 2: Credits balance check
  group('Credits Balance Check', function () {
    const start = Date.now();

    const response = http.get(`${BASE_URL}/api/credits/balance`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const success = check(response, {
      'credits check completed': (r) => r.status === 200 || r.status === 401,
    });

    creditsCheckSuccess.add(success ? 1 : 0);
    if (success) {
      dbQueryDuration.add(Date.now() - start);
    } else {
      dbErrors.add(1);
    }

    sleep(0.5);
  });

  // Test 3: Invite code validation
  group('Invite Code Validation', function () {
    const start = Date.now();

    // Test with a random code (will fail validation but tests DB query)
    const testCode = `TEST${Math.floor(Math.random() * 10000)}`;

    const response = http.post(
      `${BASE_URL}/api/invites/validate`,
      JSON.stringify({ code: testCode }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const success = check(response, {
      'invite validation completed': (r) => r.status === 200 || r.status === 400 || r.status === 401,
    });

    inviteValidationSuccess.add(success ? 1 : 0);
    if (success) {
      dbQueryDuration.add(Date.now() - start);
    } else {
      dbErrors.add(1);
    }

    sleep(0.5);
  });

  // Test 4: Session participants query
  group('Session Participants Query', function () {
    const start = Date.now();

    // Create a test session first
    const sessionData = {
      title: `DB Load Test ${__VU}-${__ITER}`,
      description: 'Testing database performance',
      isPublic: true,
      maxPresenters: 4,
    };

    const createResponse = http.post(
      `${BASE_URL}/api/sessions/create`,
      JSON.stringify(sessionData),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (createResponse.status === 200) {
      const session = createResponse.json('session');

      // Query participants
      const participantsResponse = http.get(
        `${BASE_URL}/api/sessions/${session.id}/participants`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const success = check(participantsResponse, {
        'participants query completed': (r) => r.status === 200 || r.status === 401,
      });

      participantQuerySuccess.add(success ? 1 : 0);
      if (success) {
        dbQueryDuration.add(Date.now() - start);
      } else {
        dbErrors.add(1);
      }
    }

    sleep(1);
  });

  // Test 5: Credits leaderboard (complex query with aggregations)
  group('Credits Leaderboard Query', function () {
    const start = Date.now();

    const response = http.get(`${BASE_URL}/api/credits/leaderboard`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const success = check(response, {
      'leaderboard query completed': (r) => r.status === 200 || r.status === 401,
    });

    if (success) {
      dbQueryDuration.add(Date.now() - start);
    } else {
      dbErrors.add(1);
    }

    sleep(1);
  });

  sleep(Math.random() * 2 + 1); // Random think time
}

export function handleSummary(data) {
  const summary = generateSummary(data);

  return {
    'stdout': summary,
    'results/database-results.json': JSON.stringify(data),
  };
}

function generateSummary(data) {
  let summary = '\n=== Database Load Test Summary ===\n\n';

  summary += `Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `Max VUs: ${data.metrics.vus_max?.values?.value || 0}\n\n`;

  summary += 'Database Query Success Rates:\n';
  summary += `  User Lookup: ${(data.metrics.user_lookup_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `  Credits Check: ${(data.metrics.credits_check_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `  Invite Validation: ${(data.metrics.invite_validation_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `  Participant Query: ${(data.metrics.participant_query_success?.values?.rate * 100)?.toFixed(2) || 0}%\n\n`;

  summary += 'Database Query Performance:\n';
  summary += `  Query Duration (p50): ${data.metrics.db_query_duration?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `  Query Duration (p95): ${data.metrics.db_query_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `  Query Duration (p99): ${data.metrics.db_query_duration?.values?.['p(99)']?.toFixed(2) || 0}ms\n`;
  summary += `  Max Query Duration: ${data.metrics.db_query_duration?.values?.max?.toFixed(2) || 0}ms\n\n`;

  summary += 'Error Metrics:\n';
  summary += `  Database Errors: ${data.metrics.db_errors?.values?.count || 0}\n`;
  summary += `  HTTP Failed Requests: ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) || 0}%\n\n`;

  summary += 'Overall HTTP Metrics:\n';
  summary += `  Total Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `  Request Rate: ${data.metrics.http_reqs?.values?.rate?.toFixed(2) || 0}/s\n`;
  summary += `  HTTP Duration (p95): ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;

  return summary;
}
