# Rate Limiting Quick Reference

## Protected Endpoints Summary

| Endpoint | Limit | Window | Identifier | Purpose |
|----------|-------|--------|------------|---------|
| `/api/auth/send-otp` | 3 | 5 min | Phone | Prevent SMS spam |
| `/api/invites/validate` | 10 | 1 min | IP | Prevent brute force |
| `/api/sessions/create` | 5 | 1 hour | User ID | Prevent room spam |
| `/api/credits/tip` | 10 | 1 hour | User ID | Prevent credit farming |
| `/api/auth/complete-phone-signup` | 10 | 5 min | IP | Prevent signup spam |
| `/api/ai/chat` | 30 | 1 min | User ID | Prevent API abuse |
| `/api/matchmaking/find-session` | 20 | 1 hour | User ID | Prevent queue spam |
| `/api/profile/matchmaking` | 5 | 10 min | User ID | Prevent profile spam |

## Environment Setup

### Development (Automatic)
No configuration needed - uses in-memory rate limiting.

### Production (Recommended)
Add to `.env`:
```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

Get free Redis at: [https://upstash.com](https://upstash.com)

## Adding Rate Limiting to New Endpoints

```typescript
import { withRateLimit, RateLimiters } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const { user } = await authenticateUser()

  return withRateLimit(
    request,
    RateLimiters.sessionCreation(user.id), // Choose appropriate limiter
    async () => {
      // Your endpoint logic
      return NextResponse.json({ success: true })
    }
  )
}
```

## Available Pre-configured Limiters

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

## Testing Rate Limits

```bash
# Test with curl (should fail after limit)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/invites/validate \
    -H "Content-Type: application/json" \
    -d '{"code":"TEST123"}' \
    -w "\nStatus: %{http_code}\n"
done
```

## Rate Limit Response

**429 Too Many Requests**
```json
{
  "error": "Rate limit exceeded",
  "limit": 10,
  "retryAfter": 60,
  "resetAt": "2025-11-12T10:30:00.000Z"
}
```

## Monitoring

Check these headers on all responses:
- `X-RateLimit-Limit`: Maximum allowed
- `X-RateLimit-Remaining`: Requests left
- `X-RateLimit-Reset`: When limit resets
- `Retry-After`: Seconds to wait (429 only)

## Troubleshooting

**Rate limiting not working?**
- Check Upstash credentials in `.env`
- Verify console for errors
- Test with curl commands

**Too strict?**
- Edit limits in `/lib/rate-limit.ts`
- Adjust in `RateLimiters` object

**Need custom limits?**
```typescript
await applyRateLimit(request, {
  limit: 100,
  window: 60000, // 1 minute in ms
  prefix: 'custom:action',
  identifier: 'custom-id',
})
```

## Files Modified

- `/lib/rate-limit.ts` - Core system
- `/app/api/auth/send-otp/route.ts` - NEW endpoint
- `/app/api/invites/validate/route.ts` - Protected
- `/app/api/sessions/create/route.ts` - Protected
- `/app/api/credits/tip/route.ts` - Protected
- `/app/api/auth/complete-phone-signup/route.ts` - Protected
- `/app/api/ai/chat/route.ts` - Protected
- `/app/api/matchmaking/find-session/route.ts` - Protected
- `/app/api/profile/matchmaking/route.ts` - Protected
