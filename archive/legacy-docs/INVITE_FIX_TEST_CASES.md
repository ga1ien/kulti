# Invite Code Race Condition Fix - Test Cases

## Test Suite Overview

This document provides comprehensive test cases to verify the race condition fixes work correctly.

## Database Setup for Testing

```sql
-- Create test invite code
INSERT INTO invites (code, created_by, max_uses, is_active)
VALUES ('KTEST1', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), 3, true);

-- Create test users
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'test1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'test2@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'test3@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'test4@example.com');

INSERT INTO profiles (id, username, display_name)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'testuser1', 'Test User 1'),
  ('22222222-2222-2222-2222-222222222222', 'testuser2', 'Test User 2'),
  ('33333333-3333-3333-3333-333333333333', 'testuser3', 'Test User 3'),
  ('44444444-4444-4444-4444-444444444444', 'testuser4', 'Test User 4');
```

## Test Case 1: Normal Invite Usage (Happy Path)

**Objective**: Verify normal invite code usage works correctly

### Setup
```sql
-- Create fresh invite code
INSERT INTO invites (code, created_by, max_uses, is_active)
VALUES ('KTEST_NORMAL', 'admin-user-id', 1, true);
```

### Test
```sql
SELECT use_invite_code('KTEST_NORMAL', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
```

### Expected Result
```json
{
  "success": true,
  "invite_id": "...",
  "use_id": "..."
}
```

### Verification
```sql
-- Check invite_uses table
SELECT * FROM invite_uses
WHERE used_by = '11111111-1111-1111-1111-111111111111';
-- Should return 1 row

-- Check current_uses updated
SELECT code, current_uses, max_uses FROM invites WHERE code = 'KTEST_NORMAL';
-- Should show: current_uses = 1, max_uses = 1

-- Check profile updated
SELECT invite_code FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
-- Should return: KTEST_NORMAL
```

---

## Test Case 2: Duplicate Usage Prevention (Same User, Same Code)

**Objective**: Verify same user cannot use same code twice

### Setup
```sql
-- Create invite and use it once
INSERT INTO invites (code, created_by, max_uses, is_active)
VALUES ('KTEST_DUP', 'admin-user-id', 5, true);

SELECT use_invite_code('KTEST_DUP', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
-- First usage succeeds
```

### Test
```sql
-- Try to use same code again with same user
SELECT use_invite_code('KTEST_DUP', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
```

### Expected Result
```json
{
  "success": false,
  "error": "You have already used this invite code"
}
```

### Verification
```sql
-- Verify only one usage record exists
SELECT COUNT(*) FROM invite_uses
WHERE invite_id = (SELECT id FROM invites WHERE code = 'KTEST_DUP')
  AND used_by = '11111111-1111-1111-1111-111111111111';
-- Should return: 1

-- Verify current_uses is still correct
SELECT current_uses FROM invites WHERE code = 'KTEST_DUP';
-- Should return: 1 (not 2)
```

---

## Test Case 3: Concurrent Usage (Multiple Users)

**Objective**: Verify multiple users can use same code concurrently (up to max_uses)

### Setup
```sql
-- Create invite with max_uses = 3
INSERT INTO invites (code, created_by, max_uses, is_active)
VALUES ('KTEST_CONCURRENT', 'admin-user-id', 3, true);
```

### Test (Run in parallel using pgbench or separate connections)

**Connection 1:**
```sql
SELECT use_invite_code('KTEST_CONCURRENT', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
```

**Connection 2:**
```sql
SELECT use_invite_code('KTEST_CONCURRENT', '22222222-2222-2222-2222-222222222222', '{}'::jsonb);
```

**Connection 3:**
```sql
SELECT use_invite_code('KTEST_CONCURRENT', '33333333-3333-3333-3333-333333333333', '{}'::jsonb);
```

**Connection 4 (should fail):**
```sql
SELECT use_invite_code('KTEST_CONCURRENT', '44444444-4444-4444-4444-444444444444', '{}'::jsonb);
```

### Expected Results
- Connections 1, 2, 3: `{"success": true}`
- Connection 4: `{"success": false, "error": "Invite code has been fully used"}`

### Verification
```sql
-- Check exactly 3 usage records
SELECT COUNT(*) FROM invite_uses
WHERE invite_id = (SELECT id FROM invites WHERE code = 'KTEST_CONCURRENT');
-- Should return: 3

-- Check current_uses equals max_uses
SELECT current_uses, max_uses FROM invites WHERE code = 'KTEST_CONCURRENT';
-- Should return: current_uses = 3, max_uses = 3

-- Verify all 3 users recorded
SELECT used_by FROM invite_uses
WHERE invite_id = (SELECT id FROM invites WHERE code = 'KTEST_CONCURRENT')
ORDER BY used_at;
-- Should show user IDs: 111..., 222..., 333...
```

---

## Test Case 4: Lock Contention Handling

**Objective**: Verify NOWAIT returns immediately when lock is held

### Setup
```sql
-- Create invite
INSERT INTO invites (code, created_by, max_uses, is_active)
VALUES ('KTEST_LOCK', 'admin-user-id', 5, true);
```

### Test (Requires 2 concurrent transactions)

**Transaction 1 (hold lock):**
```sql
BEGIN;
SELECT * FROM invites WHERE code = 'KTEST_LOCK' FOR UPDATE;
-- Keep transaction open
```

**Transaction 2 (attempt usage while lock held):**
```sql
-- In separate connection while Transaction 1 is still open
SELECT use_invite_code('KTEST_LOCK', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
```

### Expected Result (Transaction 2)
```json
{
  "success": false,
  "error": "This invite code is currently being processed. Please try again."
}
```

### Verification
```sql
-- Transaction 2 should return immediately (< 100ms)
-- Not wait for Transaction 1 to commit/rollback

-- After Transaction 1 commits/rollbacks:
COMMIT; -- or ROLLBACK; in Transaction 1

-- Transaction 2 can retry and succeed
SELECT use_invite_code('KTEST_LOCK', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
-- Should succeed now
```

---

## Test Case 5: Expired Invite Code

**Objective**: Verify expired codes are rejected

### Setup
```sql
-- Create invite that expires in the past
INSERT INTO invites (code, created_by, max_uses, expires_at, is_active)
VALUES ('KTEST_EXPIRED', 'admin-user-id', 5, NOW() - INTERVAL '1 day', true);
```

### Test
```sql
SELECT use_invite_code('KTEST_EXPIRED', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
```

### Expected Result
```json
{
  "success": false,
  "error": "Invite code has expired"
}
```

### Verification
```sql
-- No usage record should be created
SELECT COUNT(*) FROM invite_uses
WHERE invite_id = (SELECT id FROM invites WHERE code = 'KTEST_EXPIRED');
-- Should return: 0
```

---

## Test Case 6: Inactive Invite Code

**Objective**: Verify inactive codes are rejected

### Setup
```sql
-- Create inactive invite
INSERT INTO invites (code, created_by, max_uses, is_active)
VALUES ('KTEST_INACTIVE', 'admin-user-id', 5, false);
```

### Test
```sql
SELECT use_invite_code('KTEST_INACTIVE', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
```

### Expected Result
```json
{
  "success": false,
  "error": "Invalid invite code"
}
```

---

## Test Case 7: Max Uses Boundary

**Objective**: Verify exact max_uses limit is enforced

### Setup
```sql
-- Create invite with max_uses = 2
INSERT INTO invites (code, created_by, max_uses, is_active)
VALUES ('KTEST_BOUNDARY', 'admin-user-id', 2, true);

-- Use it once
SELECT use_invite_code('KTEST_BOUNDARY', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
```

### Test
```sql
-- Second user (should succeed - at boundary)
SELECT use_invite_code('KTEST_BOUNDARY', '22222222-2222-2222-2222-222222222222', '{}'::jsonb);

-- Third user (should fail - over boundary)
SELECT use_invite_code('KTEST_BOUNDARY', '33333333-3333-3333-3333-333333333333', '{}'::jsonb);
```

### Expected Results
- Second user: `{"success": true}`
- Third user: `{"success": false, "error": "Invite code has been fully used"}`

### Verification
```sql
SELECT current_uses, max_uses FROM invites WHERE code = 'KTEST_BOUNDARY';
-- Should return: current_uses = 2, max_uses = 2
```

---

## Test Case 8: Referral Credits Award

**Objective**: Verify referral credits are awarded to code creator

### Setup
```sql
-- Create invite by specific user
INSERT INTO invites (code, created_by, max_uses, is_active)
VALUES ('KTEST_REFERRAL', '11111111-1111-1111-1111-111111111111', 5, true);

-- Check creator's credits before
SELECT credits FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
-- Note the amount
```

### Test
```sql
-- Different user uses the code
SELECT use_invite_code('KTEST_REFERRAL', '22222222-2222-2222-2222-222222222222', '{}'::jsonb);
```

### Expected Result
```json
{
  "success": true,
  "invite_id": "...",
  "use_id": "..."
}
```

### Verification
```sql
-- Check creator received 50 credits
SELECT credits FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
-- Should be: previous_credits + 50

-- Check credit transaction recorded
SELECT * FROM credit_transactions
WHERE user_id = '11111111-1111-1111-1111-111111111111'
  AND type = 'referral_bonus'
ORDER BY created_at DESC
LIMIT 1;
-- Should show: amount = 50, metadata contains referred_user_id
```

---

## Test Case 9: Self-Referral Prevention

**Objective**: Verify user cannot refer themselves

### Setup
```sql
-- Create invite by specific user
INSERT INTO invites (code, created_by, max_uses, is_active)
VALUES ('KTEST_SELF', '11111111-1111-1111-1111-111111111111', 5, true);

-- Check creator's credits before
SELECT credits FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
-- Note the amount
```

### Test
```sql
-- Same user tries to use their own code
SELECT use_invite_code('KTEST_SELF', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);
```

### Expected Result
```json
{
  "success": true,
  "invite_id": "...",
  "use_id": "..."
}
```

### Verification
```sql
-- Check NO credits were awarded (self-referral check)
SELECT credits FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
-- Should be: same as before (unchanged)

-- Check NO referral transaction created
SELECT COUNT(*) FROM credit_transactions
WHERE user_id = '11111111-1111-1111-1111-111111111111'
  AND type = 'referral_bonus'
  AND metadata->>'referred_user_id' = '11111111-1111-1111-1111-111111111111';
-- Should return: 0
```

---

## Test Case 10: Idempotent Retry (API Level)

**Objective**: Verify user can complete signup after retry when invite already used

### Test (via API endpoint)
```bash
# First attempt (partial failure scenario)
curl -X POST http://localhost:3000/api/auth/complete-phone-signup \
  -H "Content-Type: application/json" \
  -H "Cookie: session-cookie" \
  -d '{
    "userId": "11111111-1111-1111-1111-111111111111",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "username": "testuser",
    "displayName": "Test User",
    "inviteCode": "KTEST1",
    "phone": "+15555551234"
  }'

# Simulate network error, user retries
# Second attempt (should succeed despite "already used" invite)
curl -X POST http://localhost:3000/api/auth/complete-phone-signup \
  -H "Content-Type: application/json" \
  -H "Cookie: session-cookie" \
  -d '{
    "userId": "11111111-1111-1111-1111-111111111111",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "username": "testuser",
    "displayName": "Test User",
    "inviteCode": "KTEST1",
    "phone": "+15555551234"
  }'
```

### Expected Results
- First attempt: `{"success": true}`
- Second attempt: `{"success": true}` (idempotent, despite "already used")

### Verification
```sql
-- Verify only one invite usage
SELECT COUNT(*) FROM invite_uses
WHERE used_by = '11111111-1111-1111-1111-111111111111';
-- Should return: 1

-- Verify profile exists
SELECT * FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
-- Should exist with correct username and display_name
```

---

## Performance Test: Concurrent Load

**Objective**: Verify system handles high concurrent load correctly

### Setup
```bash
# Create invite with high max_uses
psql -c "INSERT INTO invites (code, created_by, max_uses, is_active)
         VALUES ('KTEST_LOAD', 'admin-user-id', 100, true);"
```

### Test (using pgbench or parallel curl)
```bash
# Simulate 50 concurrent users attempting to use same code
# Create 50 test users first, then:

seq 1 50 | xargs -P 50 -I {} curl -X POST http://localhost:3000/api/auth/complete-phone-signup \
  -H "Content-Type: application/json" \
  -H "Cookie: session-cookie-{}" \
  -d '{
    "userId": "user-{}-uuid",
    "email": "test{}@example.com",
    "password": "SecurePass123!",
    "username": "testuser{}",
    "displayName": "Test User {}",
    "inviteCode": "KTEST_LOAD",
    "phone": "+1555555{:04d}"
  }'
```

### Expected Results
- All 50 requests complete (some may need 1 retry due to lock contention)
- Response times: p50 < 100ms, p95 < 500ms, p99 < 1000ms
- No database deadlocks or integrity violations

### Verification
```sql
-- Verify exactly 50 usages
SELECT COUNT(*) FROM invite_uses
WHERE invite_id = (SELECT id FROM invites WHERE code = 'KTEST_LOAD');
-- Should return: 50

-- Verify current_uses matches
SELECT current_uses FROM invites WHERE code = 'KTEST_LOAD';
-- Should return: 50

-- Check no duplicate users
SELECT used_by, COUNT(*)
FROM invite_uses
WHERE invite_id = (SELECT id FROM invites WHERE code = 'KTEST_LOAD')
GROUP BY used_by
HAVING COUNT(*) > 1;
-- Should return: 0 rows
```

---

## Cleanup

```sql
-- Remove test data
DELETE FROM invite_uses WHERE invite_id IN (
  SELECT id FROM invites WHERE code LIKE 'KTEST%'
);

DELETE FROM invites WHERE code LIKE 'KTEST%';

DELETE FROM profiles WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);

DELETE FROM auth.users WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);
```

## Test Automation Script

```bash
#!/bin/bash
# run_invite_tests.sh

set -e

echo "Running invite code race condition tests..."

# Test 1: Normal usage
echo "Test 1: Normal invite usage"
psql -f test_case_1.sql

# Test 2: Duplicate prevention
echo "Test 2: Duplicate usage prevention"
psql -f test_case_2.sql

# Test 3: Concurrent usage
echo "Test 3: Concurrent usage"
parallel psql -f test_case_3_{}.sql ::: 1 2 3 4

# Test 4: Max uses boundary
echo "Test 4: Max uses boundary"
psql -f test_case_7.sql

echo "All tests passed!"
```

## Success Criteria

All tests must:
- [ ] Execute without errors
- [ ] Return expected results
- [ ] Maintain data integrity (no duplicate usage)
- [ ] Complete within performance SLA
- [ ] Handle edge cases gracefully
- [ ] Provide clear error messages
