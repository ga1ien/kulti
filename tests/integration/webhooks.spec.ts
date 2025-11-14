import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test.describe('HMS Webhooks Integration', () => {
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/hms';

  function generateHMSSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  test('should verify webhook signature', async ({ request }) => {
    const payload = {
      version: '2.0',
      id: 'test-webhook-id',
      timestamp: new Date().toISOString(),
      type: 'recording.success',
      data: {
        room_id: 'test-room-123',
        session_id: 'test-session-456',
        recording_id: 'test-recording-789',
        recording_url: 'https://example.com/recording.mp4',
        size: 1024000,
        duration: 3600,
      },
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.HMS_APP_SECRET || 'test-secret';
    const signature = generateHMSSignature(payloadString, secret);

    const response = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-hms-signature': signature,
      },
      data: payload,
    });

    // Should process webhook successfully
    expect(response.status()).toBe(200);
  });

  test('should reject webhook with invalid signature', async ({ request }) => {
    const payload = {
      version: '2.0',
      id: 'test-webhook-id',
      timestamp: new Date().toISOString(),
      type: 'recording.success',
      data: {
        room_id: 'test-room-123',
      },
    };

    const response = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-hms-signature': 'invalid-signature',
      },
      data: payload,
    });

    // Should reject with 401
    expect(response.status()).toBe(401);
  });

  test('should handle recording.success webhook', async ({ request }) => {
    const payload = {
      version: '2.0',
      id: `webhook-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'recording.success',
      data: {
        room_id: 'test-room-recording',
        session_id: 'test-session-recording',
        recording_id: 'rec-123',
        recording_url: 'https://cdn.100ms.live/recordings/test.mp4',
        size: 5242880,
        duration: 7200,
        started_at: new Date().toISOString(),
        stopped_at: new Date().toISOString(),
      },
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.HMS_APP_SECRET || 'test-secret';
    const signature = generateHMSSignature(payloadString, secret);

    const response = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-hms-signature': signature,
      },
      data: payload,
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);
  });

  test('should handle live-stream.started webhook', async ({ request }) => {
    const payload = {
      version: '2.0',
      id: `webhook-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'live-stream.started',
      data: {
        room_id: 'test-room-hls',
        session_id: 'test-session-hls',
        stream_id: 'stream-123',
        playback_url: 'https://cdn.100ms.live/hls/test.m3u8',
        started_at: new Date().toISOString(),
      },
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.HMS_APP_SECRET || 'test-secret';
    const signature = generateHMSSignature(payloadString, secret);

    const response = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-hms-signature': signature,
      },
      data: payload,
    });

    expect(response.status()).toBe(200);
  });

  test('should handle session.started webhook', async ({ request }) => {
    const payload = {
      version: '2.0',
      id: `webhook-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'session.started',
      data: {
        room_id: 'test-room-start',
        session_id: 'test-session-start',
        started_at: new Date().toISOString(),
      },
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.HMS_APP_SECRET || 'test-secret';
    const signature = generateHMSSignature(payloadString, secret);

    const response = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-hms-signature': signature,
      },
      data: payload,
    });

    expect(response.status()).toBe(200);
  });

  test('should handle session.ended webhook', async ({ request }) => {
    const payload = {
      version: '2.0',
      id: `webhook-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'session.ended',
      data: {
        room_id: 'test-room-end',
        session_id: 'test-session-end',
        ended_at: new Date().toISOString(),
        duration: 3600,
      },
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.HMS_APP_SECRET || 'test-secret';
    const signature = generateHMSSignature(payloadString, secret);

    const response = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-hms-signature': signature,
      },
      data: payload,
    });

    expect(response.status()).toBe(200);
  });

  test('should reject webhook with missing signature', async ({ request }) => {
    const payload = {
      version: '2.0',
      id: 'test-webhook-id',
      timestamp: new Date().toISOString(),
      type: 'recording.success',
      data: {},
    };

    const response = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: payload,
    });

    expect(response.status()).toBe(401);
  });

  test('should handle malformed webhook payload gracefully', async ({ request }) => {
    const secret = process.env.HMS_APP_SECRET || 'test-secret';
    const payload = 'invalid json';
    const signature = generateHMSSignature(payload, secret);

    const response = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-hms-signature': signature,
      },
      data: payload,
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should deduplicate webhook events', async ({ request }) => {
    const webhookId = `duplicate-test-${Date.now()}`;
    const payload = {
      version: '2.0',
      id: webhookId,
      timestamp: new Date().toISOString(),
      type: 'recording.success',
      data: {
        room_id: 'test-room-duplicate',
        recording_id: 'rec-duplicate',
      },
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.HMS_APP_SECRET || 'test-secret';
    const signature = generateHMSSignature(payloadString, secret);

    // Send first webhook
    const response1 = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-hms-signature': signature,
      },
      data: payload,
    });

    expect(response1.status()).toBe(200);

    // Send duplicate webhook
    const response2 = await request.post(webhookUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-hms-signature': signature,
      },
      data: payload,
    });

    // Should handle duplicate gracefully (either 200 or 409)
    expect([200, 409]).toContain(response2.status());
  });
});

test.describe('Webhook Data Persistence', () => {
  test('should save recording data to database', async ({ request }) => {
    const recordingId = `rec-persist-${Date.now()}`;
    const payload = {
      version: '2.0',
      id: `webhook-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'recording.success',
      data: {
        room_id: 'test-room-persist',
        session_id: 'test-session-persist',
        recording_id: recordingId,
        recording_url: 'https://cdn.100ms.live/recordings/persist.mp4',
        size: 10485760,
        duration: 3600,
      },
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.HMS_APP_SECRET || 'test-secret';
    const signature = generateHMSSignature(payloadString, secret);

    const response = await request.post(
      process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/hms',
      {
        headers: {
          'Content-Type': 'application/json',
          'x-hms-signature': signature,
        },
        data: payload,
      }
    );

    expect(response.status()).toBe(200);

    // Note: In a real test, we would query the database to verify
    // the recording was saved correctly
  });
});
