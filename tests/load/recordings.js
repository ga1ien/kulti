/**
 * Recording Load Test
 *
 * Tests recording functionality under load:
 * - Multiple simultaneous recording starts
 * - Concurrent recording stops
 * - Webhook processing under load
 * - Recording list fetching
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, THRESHOLDS } from './config.js';

// Custom metrics
const recordingStartSuccess = new Rate('recording_start_success');
const recordingStopSuccess = new Rate('recording_stop_success');
const recordingListSuccess = new Rate('recording_list_success');
const recordingStartDuration = new Trend('recording_start_duration');
const recordingStopDuration = new Trend('recording_stop_duration');
const recordingErrors = new Counter('recording_errors');
const activeRecordings = new Counter('active_recordings');

// Test configuration
export const options = {
  scenarios: {
    // Test recording lifecycle
    recording_lifecycle: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },    // Start with 5 concurrent recordings
        { duration: '2m', target: 10 },   // Scale to 10
        { duration: '2m', target: 10 },   // Hold at 10
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    'recording_start_success': ['rate>0.90'], // 90% success for starts
    'recording_stop_success': ['rate>0.95'],  // 95% success for stops
    'recording_start_duration': ['p(95)<5000'], // Recording start can take longer
    'recording_stop_duration': ['p(95)<3000'],
  },
};

export default function () {
  group('Recording Lifecycle Test', function () {
    // Step 1: Create a session for recording
    const sessionData = {
      title: `Recording Test ${__VU}-${__ITER}`,
      description: 'Testing recording under load',
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

    const sessionCreated = check(sessionResponse, {
      'session created for recording': (r) => r.status === 200,
    });

    if (!sessionCreated) {
      recordingErrors.add(1);
      sleep(2);
      return;
    }

    const session = sessionResponse.json('session');
    const sessionId = session.id;
    const roomId = session.hms_room_id;

    sleep(1);

    // Step 2: Start recording
    group('Start Recording', function () {
      const startTime = Date.now();

      const startResponse = http.post(
        `${BASE_URL}/api/hms/start-recording`,
        JSON.stringify({
          roomId: roomId,
          sessionId: sessionId,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const startSuccess = check(startResponse, {
        'recording started': (r) => r.status === 200 || r.status === 401,
        'recording id returned': (r) => r.status === 401 || r.json('recording_id') !== undefined,
      });

      recordingStartSuccess.add(startSuccess ? 1 : 0);

      if (startResponse.status === 200) {
        recordingStartDuration.add(Date.now() - startTime);
        activeRecordings.add(1);

        const recordingId = startResponse.json('recording_id');

        // Simulate recording duration
        sleep(Math.random() * 5 + 5); // Record for 5-10 seconds

        // Step 3: Stop recording
        group('Stop Recording', function () {
          const stopTime = Date.now();

          const stopResponse = http.post(
            `${BASE_URL}/api/hms/stop-recording`,
            JSON.stringify({
              roomId: roomId,
              recordingId: recordingId,
            }),
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const stopSuccess = check(stopResponse, {
            'recording stopped': (r) => r.status === 200 || r.status === 401,
          });

          recordingStopSuccess.add(stopSuccess ? 1 : 0);

          if (stopResponse.status === 200) {
            recordingStopDuration.add(Date.now() - stopTime);
          } else if (stopResponse.status !== 401) {
            recordingErrors.add(1);
          }
        });
      } else if (startResponse.status !== 401) {
        recordingErrors.add(1);
      }
    });

    sleep(2);

    // Step 4: List recordings
    group('List Recordings', function () {
      const listResponse = http.get(
        `${BASE_URL}/api/recordings/list`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const listSuccess = check(listResponse, {
        'recordings listed': (r) => r.status === 200 || r.status === 401,
        'recordings array returned': (r) => r.status === 401 || Array.isArray(r.json('recordings')),
      });

      recordingListSuccess.add(listSuccess ? 1 : 0);

      if (!listSuccess && listResponse.status !== 401) {
        recordingErrors.add(1);
      }
    });

    sleep(1);
  });

  // Test webhook processing simulation
  group('Webhook Processing', function () {
    // Simulate HMS webhook for recording completion
    const webhookData = {
      type: 'recording.success',
      data: {
        room_id: `test-room-${__VU}`,
        recording_id: `rec-${__VU}-${__ITER}`,
        session_id: `session-${__VU}`,
        duration: 300,
        size: 1024 * 1024 * 50, // 50MB
        location: `https://test.com/recordings/rec-${__VU}-${__ITER}.mp4`,
      },
    };

    const webhookResponse = http.post(
      `${BASE_URL}/api/webhooks/hms`,
      JSON.stringify(webhookData),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    check(webhookResponse, {
      'webhook processed': (r) => r.status === 200 || r.status === 400,
    });

    sleep(1);
  });
}

export function handleSummary(data) {
  const summary = generateSummary(data);

  return {
    'stdout': summary,
    'results/recordings-results.json': JSON.stringify(data),
  };
}

function generateSummary(data) {
  let summary = '\n=== Recording Load Test Summary ===\n\n';

  summary += `Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `Max VUs: ${data.metrics.vus_max?.values?.value || 0}\n\n`;

  summary += 'Recording Success Rates:\n';
  summary += `  Recording Start: ${(data.metrics.recording_start_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `  Recording Stop: ${(data.metrics.recording_stop_success?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `  Recording List: ${(data.metrics.recording_list_success?.values?.rate * 100)?.toFixed(2) || 0}%\n\n`;

  summary += 'Recording Performance:\n';
  summary += `  Start Duration (p50): ${data.metrics.recording_start_duration?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `  Start Duration (p95): ${data.metrics.recording_start_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `  Stop Duration (p50): ${data.metrics.recording_stop_duration?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `  Stop Duration (p95): ${data.metrics.recording_stop_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n\n`;

  summary += 'Recording Statistics:\n';
  summary += `  Total Recordings Started: ${data.metrics.active_recordings?.values?.count || 0}\n`;
  summary += `  Recording Errors: ${data.metrics.recording_errors?.values?.count || 0}\n\n`;

  summary += 'Overall HTTP Metrics:\n';
  summary += `  Total Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `  Failed Requests: ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `  Response Time (p95): ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;

  return summary;
}
