# Rate Limiting Implementation Summary

## Overview

Comprehensive rate limiting has been implemented across all sensitive API endpoints to prevent abuse, spam, and resource exhaustion attacks.

## Implementation Details

### Core Rate Limiting System

**Location**: `/lib/rate-limit.ts`

The rate limiting system uses:
- **Production**: Upstash Redis with sliding window algorithm for distributed rate limiting
- **Development**: In-memory store with automatic cleanup for local development

### Key Features

1. **Flexible Configuration**: Pre-configured rate limiters for common use cases
2. **Automatic Fallback**: Falls back to in-memory storage if Redis is not configured
3. **Standard Headers**: Returns standard rate limit headers (X-RateLimit-*)
4. **Clear Error Messages**: Provides actionable error messages with retry information
5. **Per-User/IP Limiting**: Supports both user-based and IP-based rate limiting

## Protected Endpoints

### 1. Phone OTP Sending (`/api/auth/send-otp`)
- **Limit**: 3 requests per 5 minutes per phone number
- **Purpose**: Prevents SMS spam and phishing attacks
- **Identifier**: Phone number
- **Key**: `otp:phone:{phone}`

### 2. Invite Code Validation (`/api/invites/validate`)
- **Limit**: 10 requests per minute per IP address
- **Purpose**: Prevents brute force attempts to guess invite codes
- **Identifier**: IP address
- **Key**: `invite:validate:{ip}`

### 3. Session Creation (`/api/sessions/create`)
- **Limit**: 5 sessions per hour per user
- **Purpose**: Prevents room spam and resource exhaustion
- **Identifier**: User ID
- **Key**: `session:create:{userId}`

### 4. Credits Tipping (`/api/credits/tip`)
- **Limit**: 10 tips per hour per user
- **Purpose**: Prevents credit farming and spam tipping
- **Identifier**: User ID
- **Key**: `credits:tip:{userId}`

### 5. Authentication Attempts (`/api/auth/complete-phone-signup`)
- **Limit**: 10 requests per 5 minutes per IP address
- **Purpose**: Prevents account creation spam and credential stuffing
- **Identifier**: IP address
- **Key**: `auth:attempt:{ip}`

### 6. AI Chat Messages (`/api/ai/chat`)
- **Limit**: 30 requests per minute per user
- **Purpose**: Prevents API abuse and excessive AI costs
- **Identifier**: User ID
- **Key**: `ai:chat:{userId}`

### 7. Matchmaking Requests (`/api/matchmaking/find-session`)
- **Limit**: 20 requests per hour per user
- **Purpose**: Prevents matchmaking queue spam
- **Identifier**: User ID
- **Key**: `matchmaking:request:{userId}`

### 8. Profile Updates (`/api/profile/matchmaking`)
- **Limit**: 5 requests per 10 minutes per user
- **Purpose**: Prevents profile update spam
- **Identifier**: User ID
- **Key**: `profile:update:{userId}`

## Rate Limit Response Format

When a rate limit is exceeded, the API returns:

**Status Code**: `429 Too Many Requests`

**Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-11-12T10:30:00.000Z
Retry-After: 60
```

**Response Body**:
```json
{
  "error": "Rate limit exceeded",
  "limit": 10,
  "retryAfter": 60,
  "resetAt": "2025-11-12T10:30:00.000Z"
}
```

## Configuration

### Environment Variables

For production deployment with distributed rate limiting, add to `.env`:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

If these variables are not set, the system automatically falls back to in-memory rate limiting (suitable for development only).

### Setting Up Upstash Redis

1. Sign up at [https://upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the REST URL and token
4. Add them to your environment variables
5. Deploy your application

**Important**: In-memory rate limiting only works on a single server instance. For production deployments with multiple instances (load balancing), you MUST use Upstash Redis.

## Usage Example

### Using Pre-configured Rate Limiters

```typescript
import { withRateLimit, RateLimiters } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Authenticate user first
  const { user } = await getUser()

  // Apply rate limiting
  return withRateLimit(
    request,
    RateLimiters.sessionCreation(user.id),
    async () => {
      // Your endpoint logic here
      return NextResponse.json({ success: true })
    }
  )
}
```

### Custom Rate Limit Configuration

```typescript
import { applyRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const { allowed, response } = await applyRateLimit(request, {
    limit: 100,
    window: 60 * 1000, // 1 minute
    prefix: 'custom:action',
    identifier: 'custom-identifier', // optional
  })

  if (!allowed && response) {
    return response
  }

  // Your endpoint logic here
}
```

## Pre-configured Rate Limiters

The system includes the following pre-configured rate limiters:

```typescript
RateLimiters.phoneOTP(phoneNumber)        // 3 per 5 min
RateLimiters.inviteValidation()           // 10 per 1 min (IP)
RateLimiters.sessionCreation(userId)      // 5 per 1 hour
RateLimiters.creditsTipping(userId)       // 10 per 1 hour
RateLimiters.authAttempts()               // 10 per 5 min (IP)
RateLimiters.aiChat(userId)               // 30 per 1 min
RateLimiters.matchmaking(userId)          // 20 per 1 hour
RateLimiters.profileUpdate(userId)        // 5 per 10 min
```

## Testing

### Testing Rate Limits Locally

1. Start your development server
2. Make repeated requests to a protected endpoint
3. After exceeding the limit, you should receive a 429 response
4. Wait for the time window to reset and try again

### Testing with cURL

```bash
# Test invite validation rate limit (should fail after 10 requests)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/invites/validate \
    -H "Content-Type: application/json" \
    -d '{"code":"TEST123"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

## Monitoring and Observability

### Rate Limit Headers

All rate-limited endpoints return these headers:
- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: ISO timestamp when the limit resets
- `Retry-After`: Seconds to wait before retrying (on 429 only)

### Logging

Rate limit violations are logged to the console for monitoring:
```typescript
console.error('Rate limiting error:', error)
```

In production, integrate with your logging service (e.g., Sentry, LogRocket) to track patterns and adjust limits as needed.

## Security Considerations

1. **IP Spoofing Protection**: The system reads IP from multiple headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP) to work with various proxy configurations

2. **Graceful Degradation**: If rate limiting fails, the request is allowed (fail-open) but errors are logged for investigation

3. **Per-Resource Limiting**: Each endpoint has its own rate limit, preventing abuse of one endpoint from affecting others

4. **User vs IP**: Sensitive operations use user ID (post-auth), while public operations use IP address (pre-auth)

## Future Enhancements

Consider implementing:
1. **Dynamic Rate Limits**: Adjust limits based on user trust score or subscription tier
2. **Burst Allowance**: Allow short bursts above the limit
3. **Analytics Dashboard**: Visualize rate limit hits and patterns
4. **Alert System**: Notify admins of suspicious patterns
5. **Whitelist/Blacklist**: Manual override for specific users or IPs

## Troubleshooting

### Rate Limiting Not Working
- Check if `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Verify Upstash credentials are valid
- Check console for rate limiting errors

### Rate Limits Too Strict
- Adjust limits in `/lib/rate-limit.ts` in the `RateLimiters` object
- Consider user feedback and usage patterns
- Monitor false positives

### Rate Limits Too Lenient
- Review abuse patterns in logs
- Tighten limits for frequently abused endpoints
- Consider adding additional validation

## Related Files

- `/lib/rate-limit.ts` - Core rate limiting system
- `/app/api/auth/send-otp/route.ts` - OTP rate limiting
- `/app/api/invites/validate/route.ts` - Invite validation rate limiting
- `/app/api/sessions/create/route.ts` - Session creation rate limiting
- `/app/api/credits/tip/route.ts` - Tipping rate limiting
- `/app/api/auth/complete-phone-signup/route.ts` - Signup rate limiting
- `/app/api/ai/chat/route.ts` - AI chat rate limiting
- `/app/api/matchmaking/find-session/route.ts` - Matchmaking rate limiting
- `/app/api/profile/matchmaking/route.ts` - Profile update rate limiting

## Dependencies

```json
{
  "@upstash/ratelimit": "^2.0.4",
  "@upstash/redis": "^1.34.3"
}
```

Already installed via: `npm install @upstash/ratelimit @upstash/redis`
