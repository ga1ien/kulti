# Invite Genealogy Tracking - Usage Guide

## ✅ What Was Implemented

Complete backend tracking for referral chains. Every user is now linked to who referred them, enabling recursive genealogy queries to any depth.

---

## 🗄️ Database Changes

### New Column: `profiles.referred_by`
- **Type:** UUID (references profiles.id)
- **Purpose:** Direct link to the user who referred this person
- **Automatically set:** When someone uses an invite code during signup

### New Functions

1. **`get_all_descendants(user_id)`** - Get entire referral tree
2. **`get_referral_stats(user_id)`** - Get referral metrics
3. **`get_referral_chain(user_id)`** - Get chain from user to root
4. **`admin_referral_overview`** - View of all users with referral counts

---

## 📊 How to Query Genealogy Data

### Via Supabase Studio (SQL Editor)

#### Get a user's complete referral tree:
```sql
SELECT * FROM get_all_descendants('user-uuid-here');
```

**Returns:**
- `id` - User ID
- `username` - Username
- `display_name` - Display name
- `depth` - How many levels deep (1 = direct referral, 2 = their referral, etc.)
- `path` - Array showing the chain of usernames
- `created_at` - When they joined

#### Get referral statistics:
```sql
SELECT * FROM get_referral_stats('user-uuid-here');
```

**Returns:**
- `direct_referrals` - How many people they directly referred (depth 1)
- `total_descendants` - Total people in their tree (all depths)
- `max_depth` - Deepest level of their tree
- `total_referral_credits` - Total credits earned from referrals

#### Get chain from user back to root:
```sql
SELECT * FROM get_referral_chain('user-uuid-here');
```

**Returns:** The path from this user back to their original referrer (Level 0 = user, Level 1 = their referrer, etc.)

#### View all users with referral data:
```sql
SELECT * FROM admin_referral_overview;
```

**Returns:** All users with their referrer's username and direct referral count, sorted by most referrals.

---

## 🔍 Example Queries

### Find top referrers:
```sql
SELECT
  username,
  display_name,
  (SELECT COUNT(*) FROM profiles WHERE referred_by = p.id) as referrals
FROM profiles p
ORDER BY referrals DESC
LIMIT 10;
```

### Find users who joined via a specific invite code:
```sql
SELECT username, display_name, created_at
FROM profiles
WHERE invite_code = 'KA1B2'
ORDER BY created_at;
```

### Find orphaned users (no referrer):
```sql
SELECT username, display_name
FROM profiles
WHERE referred_by IS NULL
  AND invite_code IS NOT NULL;
```

### See complete genealogy with depth:
```sql
-- Example: User A referred User B, User B referred User C
SELECT
  username,
  display_name,
  depth,
  array_to_string(path, ' → ') as referral_chain
FROM get_all_descendants('user-a-uuid')
ORDER BY depth, created_at;
```

**Example Output:**
```
username | display_name | depth | referral_chain
---------|--------------|-------|------------------
userB    | User B       | 1     | userA → userB
userC    | User C       | 2     | userA → userB → userC
userD    | User D       | 2     | userA → userB → userD
userE    | User E       | 3     | userA → userB → userC → userE
```

---

## 🔧 Via Supabase Client (TypeScript)

### Get user's referral tree:
```typescript
const { data, error } = await supabase.rpc('get_all_descendants', {
  p_user_id: userId
})

// Returns array of descendants with depth and path
```

### Get user's stats:
```typescript
const { data, error } = await supabase.rpc('get_referral_stats', {
  p_user_id: userId
})

// Returns: { direct_referrals, total_descendants, max_depth, total_referral_credits }
```

### Get direct referrals only:
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, username, display_name, created_at')
  .eq('referred_by', userId)
  .order('created_at', { ascending: false })
```

---

## 📈 Metrics You Can Track

### Individual User Metrics:
- Direct referrals count (depth 1)
- Total descendants (all depths)
- Tree depth (how many levels)
- Credits earned from referrals
- Referral chain back to root

### Platform-wide Metrics:
- Total users with referrals
- Average referrals per user
- Deepest referral chains
- Most successful referrers
- Viral coefficient (avg descendants per user)

---

## 🎯 How It Works Automatically

1. **User signs up with invite code** → `use_invite_code()` is called
2. **Function sets `referred_by`** → Links new user to code creator
3. **Referral bonus awarded** → Code creator gets 50 credits
4. **Genealogy updated** → New user added to referrer's tree

**No manual work needed!** Everything is automatic from signup onward.

---

## 🚀 Future UI Ideas (Not Yet Implemented)

When ready to add UI, you can:

1. **User Dashboard:**
   - Show "My Referrals" section
   - Display direct count and total tree size
   - List recent referrals with join dates

2. **Admin Panel:**
   - Search any user's genealogy
   - Visualize referral trees (D3.js)
   - Export genealogy data (CSV/JSON)

3. **Leaderboard:**
   - Top referrers this week/month/all-time
   - Public recognition for top contributors

4. **Analytics:**
   - Growth charts over time
   - Referral source analysis
   - Conversion metrics

---

## 🔒 Security & Performance

### Security:
- ✅ RLS policies respected
- ✅ Functions use `SECURITY DEFINER` for consistent access
- ✅ Recursive depth limited to 100 levels (prevents infinite loops)
- ✅ Foreign key constraints prevent orphaned data

### Performance:
- ✅ Indexed on `referred_by` for fast lookups
- ✅ Recursive CTEs optimized by PostgreSQL
- ✅ Functions marked `STABLE` for caching
- ✅ Admin view can be materialized for large datasets

---

## 📝 Notes

- **Empty database:** Currently no users exist, so genealogy data will populate as users sign up
- **Backfilling:** Migration already backfilled existing users based on their `invite_code`
- **No UI required:** All data is queryable via SQL or Supabase client
- **Future-proof:** When ready for UI, data structure supports it

---

## 🎉 Summary

**What you have now:**
- ✅ Complete referral chain tracking (who referred whom, recursively)
- ✅ Referral statistics (counts, depth, credits)
- ✅ Admin visibility into entire network
- ✅ Automatic tracking on every signup
- ✅ Query functions for easy data access

**What happens next:**
- Users sign up and genealogy data builds automatically
- You can query any user's tree anytime via SQL
- When ready, build UI components using the existing functions
- Data is ready for analytics and reporting

**No further action needed** - the system is live and tracking! 🚀
