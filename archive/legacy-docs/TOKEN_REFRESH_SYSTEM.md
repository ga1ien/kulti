# HMS Token Refresh System

## Overview
Implemented a comprehensive token refresh system to prevent 24-hour session failures by automatically renewing HMS authentication tokens every 2 hours.

## Implementation Summary

### 1. Token Generation Updates
**File:** `/Users/galenoakes/Development/kulti/lib/hms/server.ts`

- **Reduced token expiry from 24h to 2h** for better security and reliability
- **Added metadata to token response:**
  - `token`: The JWT token string
  - `expiresAt`: Timestamp (in milliseconds) when the token expires
- **Added `verifyHMSToken()` helper function** for token validation during refresh

```typescript
export function generateHMSToken(
  roomId: string,
  userId: string,
  role: "host" | "presenter" | "viewer" = "viewer"
) {
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 2 * 60 * 60 // 2 hours

  // ... token generation ...

  return {
    token,
    expiresAt: (now + expiresIn) * 1000, // Milliseconds for JS Date
  }
}
```

### 2. Get Token Route Updates
**File:** `/Users/galenoakes/Development/kulti/app/api/hms/get-token/route.ts`

- **Updated to return expiry timestamp** in the response
- **Handles both guest and authenticated users** with proper token metadata
- **Maintains backward compatibility** with existing HLS viewer logic

```typescript
const tokenData = generateHMSToken(roomId, user.id, role)

return NextResponse.json({
  token: tokenData.token,
  expiresAt: tokenData.expiresAt, // NEW: Expiry timestamp
  userName: profile?.display_name || "User",
  role,
  useHLS,
  hlsStreamUrl: useHLS ? hlsStreamUrl : null,
})
```

### 3. Refresh Token Endpoint
**File:** `/Users/galenoakes/Development/kulti/app/api/hms/refresh-token/route.ts` (NEW)

- **Validates old token before issuing new one** using `verifyHMSToken()`
- **Maintains same role and permissions** as original token
- **Checks session status** to ensure it's still active
- **Verifies user participation** in the session
- **Handles both guest and authenticated users**

**Security Features:**
- Validates old token authenticity
- Ensures user ID matches token
- Checks session is still active (status = "active")
- Verifies user is still a participant
- Maintains original role without privilege escalation

### 4. Client-Side Auto-Refresh Hook
**File:** `/Users/galenoakes/Development/kulti/hooks/use-token-refresh.ts` (NEW)

A reusable React hook that handles all token refresh logic:

**Features:**
- **Automatic refresh 5 minutes before expiry**
- **User warning 10 minutes before expiry**
- **Manual refresh on connection errors**
- **Seamless token update** using HMS `refreshToken()` API
- **Error recovery** with fallback to manual rejoin

**Key Behaviors:**
```typescript
const timeUntilExpiry = tokenExpiresAt - now
const refreshTime = timeUntilExpiry - (5 * 60 * 1000)  // 5 min before expiry
const warningTime = timeUntilExpiry - (10 * 60 * 1000) // 10 min before expiry
```

**Error Handling:**
- Detects HMS error codes: 3001, 401, 403 (auth failures)
- Automatically attempts token refresh on connection errors
- Shows user-friendly toast notifications
- Graceful degradation if refresh fails

### 5. Session Room Integration
**File:** `/Users/galenoakes/Development/kulti/components/session/session-room.tsx`

**Added State Management:**
```typescript
const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null)
const [authToken, setAuthToken] = useState<string | null>(null)
```

**Integrated Token Refresh Hook:**
```typescript
const { showExpiryWarning } = useTokenRefresh({
  isConnected,
  tokenExpiresAt,
  authToken,
  roomId: session.hms_room_id,
  sessionId: session.id,
  onTokenUpdate: (token, expiresAt) => {
    setAuthToken(token)
    setTokenExpiresAt(expiresAt)
  },
})
```

**Token Storage on Join:**
```typescript
// Store token and expiry time for refresh
setAuthToken(data.token)
setTokenExpiresAt(data.expiresAt)
```

## Token Lifecycle

### Initial Join
1. User joins session → `/api/hms/get-token` endpoint
2. Server generates 2-hour token with expiry timestamp
3. Client stores token and expiry in React state
4. HMS room join with initial token

### Auto-Refresh Cycle
1. **T-10 minutes:** User sees warning toast: "Your session will refresh automatically in 5 minutes"
2. **T-5 minutes:** Auto-refresh triggered
3. Client calls `/api/hms/refresh-token` with old token
4. Server validates old token and session status
5. Server generates new 2-hour token
6. Client receives new token and expiry
7. Client calls `hmsActions.refreshToken(newToken)` for seamless update
8. Success toast: "Session token refreshed 🔄"
9. Cycle repeats every 2 hours

### Manual Refresh (Error Recovery)
1. Connection error detected (HMS error codes 3001, 401, 403)
2. Hook automatically attempts token refresh
3. If successful: "Reconnected successfully ✅"
4. If failed: User sees error, can manually rejoin

## Benefits

### Security
- **Shorter token lifetime (2h vs 24h)** reduces exposure window
- **Token validation** prevents unauthorized refresh
- **Role preservation** prevents privilege escalation
- **Session status checks** ensure tokens aren't issued for ended sessions

### Reliability
- **No 24-hour disconnects** - sessions can continue indefinitely
- **Seamless refresh** - users don't notice token renewal
- **Error recovery** - automatic retry on connection failures
- **Graceful degradation** - manual rejoin if auto-refresh fails

### User Experience
- **Zero interruption** - token refresh is invisible to users
- **Proactive warnings** - 10-minute heads-up before refresh
- **Clear notifications** - success/error states communicated via toast
- **Infinite sessions** - users can stay in sessions as long as they want

### Developer Experience
- **Reusable hook** - easy to add to other components if needed
- **Clean separation** - business logic isolated in hook
- **Comprehensive logging** - easy to debug token issues
- **Type-safe** - full TypeScript support

## Testing Checklist

1. **Initial Join**
   - [ ] Token received with valid expiry timestamp
   - [ ] Session joins successfully
   - [ ] Token stored in state correctly

2. **Auto-Refresh**
   - [ ] Warning shows at T-10 minutes
   - [ ] Refresh triggers at T-5 minutes
   - [ ] New token received and stored
   - [ ] HMS connection remains stable
   - [ ] Success toast displays

3. **Manual Refresh**
   - [ ] Connection errors trigger refresh attempt
   - [ ] Successful refresh shows success toast
   - [ ] Failed refresh shows error message

4. **Edge Cases**
   - [ ] Token already expired triggers immediate refresh
   - [ ] Session ended prevents token refresh (410 error)
   - [ ] User removed from session prevents refresh (403 error)
   - [ ] Network errors handled gracefully

5. **Guest Users**
   - [ ] Guest presenters can refresh tokens
   - [ ] Guest token validation works correctly

## Configuration

### Token Expiry Time
Located in `/Users/galenoakes/Development/kulti/lib/hms/server.ts`:
```typescript
const expiresIn = 2 * 60 * 60 // 2 hours in seconds
```

To adjust:
- Increase for longer token lifetime (less frequent refreshes)
- Decrease for shorter token lifetime (more security)
- Minimum recommended: 30 minutes
- Maximum recommended: 4 hours

### Refresh Timing
Located in `/Users/galenoakes/Development/kulti/hooks/use-token-refresh.ts`:
```typescript
const refreshTime = timeUntilExpiry - (5 * 60 * 1000)  // Refresh 5 min before expiry
const warningTime = timeUntilExpiry - (10 * 60 * 1000) // Warn 10 min before expiry
```

To adjust:
- `refreshTime`: How early to refresh (default: 5 minutes before expiry)
- `warningTime`: When to show warning (default: 10 minutes before expiry)

## Files Modified

### New Files
1. `/Users/galenoakes/Development/kulti/app/api/hms/refresh-token/route.ts` - Refresh endpoint
2. `/Users/galenoakes/Development/kulti/hooks/use-token-refresh.ts` - React hook
3. `/Users/galenoakes/Development/kulti/TOKEN_REFRESH_SYSTEM.md` - This documentation

### Modified Files
1. `/Users/galenoakes/Development/kulti/lib/hms/server.ts` - Updated token generation
2. `/Users/galenoakes/Development/kulti/app/api/hms/get-token/route.ts` - Added expiry metadata
3. `/Users/galenoakes/Development/kulti/components/session/session-room.tsx` - Integrated refresh hook

## Monitoring

### Console Logs
- `"Refreshing HMS token..."` - Refresh initiated
- `"Token refreshed successfully, expires at:"` - Refresh succeeded
- `"Token refresh failed:"` - Refresh failed (check error)
- `"Connection error detected, attempting token refresh..."` - Manual refresh triggered
- `"Manual refresh failed:"` - Manual refresh failed

### User-Visible Notifications
- ⏰ "Your session will refresh automatically in 5 minutes" (10 min warning)
- 🔄 "Session token refreshed" (successful refresh)
- ✅ "Reconnected successfully" (manual refresh success)
- ❌ "Failed to refresh session. Please rejoin if connection is lost." (refresh failure)

## Future Enhancements

1. **Metrics & Analytics**
   - Track refresh success/failure rates
   - Monitor average session lengths
   - Alert on high failure rates

2. **Retry Logic**
   - Exponential backoff for failed refreshes
   - Multiple retry attempts before giving up

3. **Token Pooling**
   - Pre-generate next token before current expires
   - Instant refresh with no API call delay

4. **Admin Controls**
   - Configurable token expiry per organization
   - Force refresh all tokens for security events
   - Token revocation API

5. **Offline Support**
   - Queue token refresh requests when offline
   - Resume when connection restored

## Support

For issues or questions:
1. Check console logs for refresh errors
2. Verify `/api/hms/refresh-token` endpoint is accessible
3. Ensure HMS credentials (HMS_APP_ACCESS_KEY, HMS_APP_SECRET) are valid
4. Check session is still active in database
5. Verify user is still a participant in the session
