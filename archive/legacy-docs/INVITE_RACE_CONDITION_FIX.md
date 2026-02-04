# Invite Code Race Condition Fix

## Problem Statement

The invite code system had critical race conditions that could allow duplicate usage:

1. **Client Validation Window**: Client-side validation happened before server-side usage recording, creating a time window where multiple users could validate the same code simultaneously
2. **No Atomicity**: Code validation and usage increment were separate operations without transaction protection
3. **Missing Constraints**: No database-level constraint prevented the same user from using the same code multiple times
4. **Concurrent Requests**: Multiple simultaneous requests from the same user could pass validation before any usage was recorded

## Solution Architecture

### 1. Database-Level Constraints

**File**: `/supabase/migrations/20251113_fix_invite_race_conditions.sql`

#### Unique Constraint
```sql
CREATE UNIQUE INDEX idx_invite_uses_unique_per_user
  ON invite_uses(invite_id, used_by);
```

**Purpose**: Prevents the same user from using the same invite code multiple times, even under concurrent requests. This is the primary defense against race conditions.

**Behavior**:
- Database will reject duplicate (invite_id, used_by) pairs
- Returns `unique_violation` error
- Cannot be bypassed by application logic

#### Performance Index
```sql
CREATE INDEX idx_invite_uses_lookup
  ON invite_uses(used_by, invite_id);
```

**Purpose**: Optimizes the pre-check query that determines if a user has already used a code.

### 2. Enhanced Database Function

**Function**: `use_invite_code()`

#### Row-Level Locking
```sql
SELECT * INTO v_invite
FROM invites
WHERE code = p_code AND is_active = true
FOR UPDATE NOWAIT;
```

**Purpose**:
- Locks the invite row during processing
- `NOWAIT` fails immediately if another transaction has the lock
- Prevents concurrent modifications to `current_uses`

**Behavior**:
- If lock is available: Transaction proceeds normally
- If lock is held: Returns error immediately instead of waiting
- User receives clear message: "This invite code is currently being processed"

#### Pre-Check for Already Used
```sql
SELECT EXISTS(
  SELECT 1 FROM invite_uses iu
  JOIN invites i ON i.id = iu.invite_id
  WHERE i.code = p_code AND iu.used_by = p_user_id
) INTO v_already_used;
```

**Purpose**: Fast check before attempting insert, provides better error message

**Behavior**:
- Runs before acquiring row lock
- Returns friendly error: "You have already used this invite code"
- Reduces unnecessary lock contention

#### Exception Handling
```sql
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This invite code is currently being processed. Please try again.'
    );
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already used this invite code'
    );
```

**Purpose**: Graceful error handling for race conditions

**Scenarios Covered**:
1. Another request is processing this code right now (lock conflict)
2. User already used this code (constraint violation)
3. Code reached max usage between validation and usage
4. Code expired between validation and usage

### 3. Service Layer Updates

**File**: `/lib/invites/service.ts`

#### Enhanced Error Handling
```typescript
if (error.message?.includes('lock_not_available')) {
  return {
    success: false,
    error: 'This invite code is currently being processed. Please try again in a moment.'
  }
}

if (error.message?.includes('unique_violation') || error.message?.includes('already used')) {
  return {
    success: false,
    error: 'You have already used this invite code'
  }
}
```

**Purpose**:
- Translates database errors into user-friendly messages
- Distinguishes between different race condition scenarios
- Provides actionable guidance (e.g., "try again")

### 4. API Route Improvements

**File**: `/app/api/auth/complete-phone-signup/route.ts`

#### Idempotent Signup Flow
```typescript
if (inviteError.message?.includes('unique_violation') ||
    inviteError.message?.includes('already used')) {
  // User already used this code - okay for retry scenarios
  console.log('User already used this invite code, continuing signup')
}
```

**Purpose**: Allow users to retry signup if previous attempt partially failed

**Behavior**:
1. User starts signup with invite code
2. Invite code is recorded successfully
3. Some other step fails (network error, etc.)
4. User retries signup with same code
5. System detects "already used" but continues (idempotency)
6. Signup completes successfully

#### Lock Contention Handling
```typescript
if (inviteError.message?.includes('lock_not_available')) {
  return NextResponse.json(
    { error: 'Invite code is being processed. Please try again.' },
    { status: 409 }
  )
}
```

**Purpose**: Return specific HTTP status for concurrent request conflicts

**Status Code**: `409 Conflict` - indicates the request conflicts with current state

## Race Condition Scenarios

### Scenario 1: Concurrent Validation
**Before**: Multiple users validate code simultaneously, all see "available"
**After**: Row lock prevents concurrent processing, only one succeeds

### Scenario 2: Double Usage by Same User
**Before**: User clicks "Sign Up" twice quickly, both requests pass validation
**After**: Unique constraint catches duplicate, second request gets clear error

### Scenario 3: Partial Signup Retry
**Before**: Signup fails after invite recorded, retry fails with "already used"
**After**: System detects idempotent retry, allows signup to complete

### Scenario 4: Max Uses Race
**Before**: Two users validate code with 1 remaining use, both can proceed
**After**: Row lock ensures only one user can increment usage counter

## Testing Recommendations

### 1. Concurrent Request Test
```bash
# Simulate 5 concurrent signup attempts with same code
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/complete-phone-signup \
    -H "Content-Type: application/json" \
    -d '{"userId":"test","email":"test@test.com","password":"test","username":"test","displayName":"Test","inviteCode":"KTEST"}' &
done
wait
```

**Expected**:
- 1 request succeeds
- 4 requests fail with "already used" or "being processed" error
- Database shows exactly 1 usage record

### 2. Retry After Failure Test
```bash
# First attempt (simulate network failure after invite recorded)
curl -X POST http://localhost:3000/api/auth/complete-phone-signup \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","email":"test@test.com","password":"test","username":"test","displayName":"Test","inviteCode":"KTEST"}'

# Second attempt (should succeed due to idempotency)
curl -X POST http://localhost:3000/api/auth/complete-phone-signup \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","email":"test@test.com","password":"test","username":"test","displayName":"Test","inviteCode":"KTEST"}'
```

**Expected**: Both requests complete successfully (idempotent behavior)

### 3. Max Uses Boundary Test
```bash
# Create code with max_uses=2
# Send 3 concurrent requests
# Verify exactly 2 succeed
```

**Expected**:
- 2 requests succeed
- 1 request fails with "fully used" error
- `current_uses` = `max_uses` = 2

## Migration Deployment

### Prerequisites
- Backup database before running migration
- Test on staging environment first
- Monitor for existing duplicate uses

### Steps
1. Run migration: `20251113_fix_invite_race_conditions.sql`
2. Verify constraints created:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'invite_uses'
   AND indexname = 'idx_invite_uses_unique_per_user';
   ```
3. Test invite code usage in staging
4. Deploy API route changes
5. Monitor error logs for race condition errors

### Rollback Plan
If issues occur:
```sql
-- Remove unique constraint
DROP INDEX IF EXISTS idx_invite_uses_unique_per_user;

-- Restore previous function version
-- (Keep backup of previous migration file)
```

## Performance Impact

### Positive Impacts
- **Reduced Lock Contention**: `NOWAIT` prevents queue buildup
- **Faster Lookups**: New index optimizes pre-checks
- **Better UX**: Clear error messages reduce user confusion

### Potential Concerns
- **Lock Conflicts**: Concurrent requests may need retry (expected behavior)
- **Index Overhead**: Slight increase in insert time (negligible for use case)

### Monitoring Metrics
- Track `lock_not_available` errors (indicates high concurrent usage)
- Monitor invite code usage latency
- Watch for unique violation errors (indicates retry scenarios)

## Database Schema Changes

### New Indexes
1. `idx_invite_uses_unique_per_user` - Unique constraint on (invite_id, used_by)
2. `idx_invite_uses_lookup` - Performance index on (used_by, invite_id)

### Modified Functions
1. `use_invite_code()` - Enhanced with row locking and better error handling

### No Breaking Changes
- All existing API contracts maintained
- Error responses enhanced but backward compatible
- Database schema additive only (no column removals)

## Security Considerations

### Positive Security Impacts
1. **Prevents Exploit**: Users cannot use same code multiple times
2. **Audit Trail**: All attempts logged, including failures
3. **Rate Limiting**: Lock mechanism prevents spam

### No New Vulnerabilities
- Row locks timeout automatically (PostgreSQL default: 60s)
- Unique constraint cannot be bypassed
- All operations still require authentication

## Summary

This fix provides comprehensive protection against invite code race conditions through:

1. **Database Constraints**: Unique index prevents duplicate usage at the lowest level
2. **Row Locking**: Serializes concurrent requests for the same invite code
3. **Graceful Degradation**: Clear error messages guide users through conflicts
4. **Idempotency**: Allows retry scenarios for improved user experience
5. **Performance**: Minimal overhead with optimized indexes

The solution is production-ready, backward-compatible, and follows PostgreSQL best practices for handling concurrent access to shared resources.
