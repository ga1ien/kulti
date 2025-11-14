/**
 * Tests for HMS server integration
 */

// Set up environment variables BEFORE importing modules
process.env.HMS_APP_ACCESS_KEY = 'test-access-key'
process.env.HMS_APP_SECRET = 'test-secret-key'
process.env.NEXT_PUBLIC_APP_URL = 'https://app.kulti.com'

import * as jwt from 'jsonwebtoken'
import {
  createHMSRoom,
  generateHMSToken,
  verifyHMSToken,
  endHMSRoom,
  createStreamKey,
  getStreamKey,
  disableStreamKey,
  startRecording,
  stopRecording,
  getRecordingStatus,
  getRoomDetails,
  getHLSStreamStatus,
  startHLSStream,
  stopHLSStream,
} from '@/lib/hms/server'

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

// Constants for testing
const HMS_APP_ACCESS_KEY = 'test-access-key'
const HMS_APP_SECRET = 'test-secret-key'
const NEXT_PUBLIC_APP_URL = 'https://app.kulti.com'

describe('HMS Server Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('createHMSRoom', () => {
    it('should create an HMS room successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ id: 'room-123', name: 'Test Room' }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const roomId = await createHMSRoom('Test Room', 'Test Description')

      expect(roomId).toBe('room-123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.100ms.live/v2/rooms',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
          }),
        })
      )
    })

    it('should throw error on failed room creation', async () => {
      const mockResponse = {
        ok: false,
        text: async () => 'API Error',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(createHMSRoom('Test Room')).rejects.toThrow('Failed to create HMS room')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(createHMSRoom('Test Room')).rejects.toThrow('Network error')
    })
  })

  describe('generateHMSToken', () => {
    it('should generate a valid HMS token', () => {
      const result = generateHMSToken('room-123', 'user-456', 'host')

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('expiresAt')
      expect(typeof result.token).toBe('string')
      expect(typeof result.expiresAt).toBe('number')
    })

    it('should generate token with correct payload', () => {
      const result = generateHMSToken('room-123', 'user-456', 'presenter')
      const decoded = jwt.verify(result.token, HMS_APP_SECRET) as any

      expect(decoded.room_id).toBe('room-123')
      expect(decoded.user_id).toBe('user-456')
      expect(decoded.role).toBe('presenter')
      expect(decoded.access_key).toBe(HMS_APP_ACCESS_KEY)
      expect(decoded.type).toBe('app')
      expect(decoded.version).toBe(2)
    })

    it('should default to viewer role', () => {
      const result = generateHMSToken('room-123', 'user-456')
      const decoded = jwt.verify(result.token, HMS_APP_SECRET) as any

      expect(decoded.role).toBe('viewer')
    })

    it('should set 2 hour expiration', () => {
      const beforeTime = Date.now()
      const result = generateHMSToken('room-123', 'user-456')
      const afterTime = Date.now()

      const twoHours = 2 * 60 * 60 * 1000
      expect(result.expiresAt).toBeGreaterThanOrEqual(beforeTime + twoHours)
      expect(result.expiresAt).toBeLessThanOrEqual(afterTime + twoHours + 1000)
    })
  })

  describe('verifyHMSToken', () => {
    it('should verify a valid token', () => {
      const { token } = generateHMSToken('room-123', 'user-456', 'host')
      const result = verifyHMSToken(token)

      expect(result.valid).toBe(true)
      expect(result.payload).toBeDefined()
      expect(result.payload?.room_id).toBe('room-123')
      expect(result.payload?.user_id).toBe('user-456')
    })

    it('should reject an invalid token', () => {
      const result = verifyHMSToken('invalid-token')

      expect(result.valid).toBe(false)
      expect(result.payload).toBeUndefined()
    })

    it('should reject a token with wrong secret', () => {
      const wrongToken = jwt.sign(
        { room_id: 'room-123', user_id: 'user-456' },
        'wrong-secret-key'
      )
      const result = verifyHMSToken(wrongToken)

      expect(result.valid).toBe(false)
    })
  })

  describe('endHMSRoom', () => {
    it('should end an HMS room successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await endHMSRoom('room-123')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.100ms.live/v2/rooms/room-123/end',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            lock: true,
            reason: 'Session ended by host',
          }),
        })
      )
    })

    it('should throw error on failed room end', async () => {
      const mockResponse = {
        ok: false,
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(endHMSRoom('room-123')).rejects.toThrow('Failed to end HMS room')
    })
  })

  describe('createStreamKey', () => {
    it('should create stream key successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'stream-123',
          key: 'abc123',
          rtmp_ingest_url: 'rtmp://ingest.example.com/live',
        }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await createStreamKey('room-123')

      expect(result).toEqual({
        id: 'stream-123',
        streamKey: 'abc123',
        rtmpUrl: 'rtmp://ingest.example.com/live',
      })
    })

    it('should use default RTMP URL if not provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'stream-123',
          key: 'abc123',
        }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await createStreamKey('room-123')

      expect(result.rtmpUrl).toBe('rtmp://ingest.100ms.live/live')
    })

    it('should throw error on failed stream key creation', async () => {
      const mockResponse = {
        ok: false,
        text: async () => 'API Error',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(createStreamKey('room-123')).rejects.toThrow('Failed to create stream key')
    })
  })

  describe('getStreamKey', () => {
    it('should get stream key successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'stream-123',
          key: 'abc123',
          enabled: true,
        }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getStreamKey('room-123')

      expect(result).toEqual({
        id: 'stream-123',
        streamKey: 'abc123',
        rtmpUrl: 'rtmp://ingest.100ms.live/live',
        active: true,
      })
    })

    it('should return null on 404', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getStreamKey('room-123')

      expect(result).toBeNull()
    })

    it('should throw error on other failures', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(getStreamKey('room-123')).rejects.toThrow('Failed to get stream key')
    })
  })

  describe('disableStreamKey', () => {
    it('should disable stream key successfully', async () => {
      const mockResponse = {
        ok: true,
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await disableStreamKey('stream-123')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.100ms.live/v2/stream-key/stream-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should throw error on failure', async () => {
      const mockResponse = {
        ok: false,
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(disableStreamKey('stream-123')).rejects.toThrow('Failed to disable stream key')
    })
  })

  describe('startRecording', () => {
    it('should start recording successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'recording-123',
          status: 'starting',
        }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await startRecording('room-123')

      expect(result).toEqual({
        id: 'recording-123',
        status: 'starting',
      })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.100ms.live/v2/recordings/room/room-123/start',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should throw error on failure', async () => {
      const mockResponse = {
        ok: false,
        text: async () => 'API Error',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(startRecording('room-123')).rejects.toThrow('Failed to start recording')
    })
  })

  describe('stopRecording', () => {
    it('should stop recording successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'recording-123',
          status: 'stopped',
        }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await stopRecording('room-123')

      expect(result).toEqual({
        id: 'recording-123',
        status: 'stopped',
      })
    })

    it('should throw error on failure', async () => {
      const mockResponse = {
        ok: false,
        text: async () => 'API Error',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(stopRecording('room-123')).rejects.toThrow('Failed to stop recording')
    })
  })

  describe('getRecordingStatus', () => {
    it('should get recording status successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'recording-123',
          status: 'completed',
          recording_url: 'https://example.com/recording.mp4',
          duration: 3600,
        }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getRecordingStatus('room-123')

      expect(result).toEqual({
        id: 'recording-123',
        status: 'completed',
        recording_url: 'https://example.com/recording.mp4',
        duration: 3600,
      })
    })

    it('should return null on 404', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getRecordingStatus('room-123')

      expect(result).toBeNull()
    })

    it('should throw error on other failures', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(getRecordingStatus('room-123')).rejects.toThrow('Failed to get recording status')
    })
  })

  describe('getRoomDetails', () => {
    it('should get room details successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'room-123',
          name: 'Test Room',
          enabled: true,
          customer_id: 'customer-123',
          created_at: '2024-01-01T00:00:00Z',
          peers: [
            { id: 'peer-1', name: 'User 1', role: 'host', user_id: 'user-1' },
            { id: 'peer-2', name: 'User 2', role: 'viewer', user_id: 'user-2' },
          ],
        }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getRoomDetails('room-123')

      expect(result).toMatchObject({
        id: 'room-123',
        name: 'Test Room',
        enabled: true,
        peer_count: 2,
      })
      expect(result.peers).toHaveLength(2)
    })

    it('should calculate peer count as 0 when no peers', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'room-123',
          name: 'Empty Room',
          enabled: true,
          customer_id: 'customer-123',
          created_at: '2024-01-01T00:00:00Z',
        }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getRoomDetails('room-123')

      expect(result.peer_count).toBe(0)
    })

    it('should throw error on failure', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(getRoomDetails('room-123')).rejects.toThrow('Failed to get room details: 500')
    })
  })

  describe('getHLSStreamStatus', () => {
    it('should get HLS stream status successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => [
          {
            id: 'stream-123',
            room_id: 'room-123',
            session_id: 'session-123',
            status: 'running',
            playback_url: 'https://example.com/stream.m3u8',
            started_at: '2024-01-01T00:00:00Z',
          },
        ],
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getHLSStreamStatus('room-123')

      expect(result).toMatchObject({
        id: 'stream-123',
        room_id: 'room-123',
        status: 'running',
        playback_url: 'https://example.com/stream.m3u8',
      })
    })

    it('should return null on 404', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getHLSStreamStatus('room-123')

      expect(result).toBeNull()
    })

    it('should return null when no active stream', async () => {
      const mockResponse = {
        ok: true,
        json: async () => [
          {
            id: 'stream-123',
            room_id: 'room-123',
            status: 'stopped',
          },
        ],
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getHLSStreamStatus('room-123')

      expect(result).toBeNull()
    })

    it('should find active stream from multiple streams', async () => {
      const mockResponse = {
        ok: true,
        json: async () => [
          { id: 'stream-1', status: 'stopped' },
          { id: 'stream-2', status: 'running', room_id: 'room-123' },
          { id: 'stream-3', status: 'starting', room_id: 'room-123' },
        ],
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await getHLSStreamStatus('room-123')

      expect(result?.id).toBe('stream-2')
      expect(result?.status).toBe('running')
    })
  })

  describe('startHLSStream', () => {
    it('should start HLS stream successfully', async () => {
      // Mock getHLSStreamStatus to return null (no existing stream)
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'stream-123',
            room_id: 'room-123',
            session_id: 'session-123',
            status: 'starting',
            recording: {
              hls_vod: true,
            },
          }),
        })

      const result = await startHLSStream('room-123')

      expect(result).toMatchObject({
        id: 'stream-123',
        room_id: 'room-123',
        status: 'starting',
      })
    })

    it('should return existing stream if already running', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 'stream-123',
            room_id: 'room-123',
            status: 'running',
          },
        ],
      })

      const result = await startHLSStream('room-123')

      expect(result.id).toBe('stream-123')
      expect(result.status).toBe('running')
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only check, no start
    })

    it('should use custom meeting URL if provided', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'stream-123',
            room_id: 'room-123',
            session_id: 'session-123',
            status: 'starting',
          }),
        })

      await startHLSStream('room-123', 'https://custom.com/meeting')

      const startCall = (global.fetch as jest.Mock).mock.calls[1]
      const body = JSON.parse(startCall[1].body)
      expect(body.meeting_url).toBe('https://custom.com/meeting')
    })

    it('should throw error on failure', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Server Error',
        })

      await expect(startHLSStream('room-123')).rejects.toThrow('Failed to start HLS stream: 500')
    })
  })

  describe('stopHLSStream', () => {
    it('should stop HLS stream successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'stream-123',
          status: 'stopping',
        }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await stopHLSStream('room-123')

      expect(result).toEqual({
        id: 'stream-123',
        status: 'stopping',
      })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.100ms.live/v2/live-streams/room/room-123/stop',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should throw error on failure', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(stopHLSStream('room-123')).rejects.toThrow('Failed to stop HLS stream: 500')
    })
  })
})
