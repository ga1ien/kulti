# Admin Dashboard Quick Start Guide

## Step 1: Make Yourself an Admin

### Option A: Using Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run this query (replace with your username):

```sql
UPDATE profiles
SET role = 'admin'
WHERE username = 'your_username_here';
```

### Option B: Using Supabase MCP (if available)
```sql
UPDATE profiles
SET role = 'admin'
WHERE username = 'your_username_here';
```

### Verify Your Admin Status
```sql
SELECT id, username, display_name, role
FROM profiles
WHERE username = 'your_username_here';
```

---

## Step 2: Access the Admin Dashboard

1. Log into your application
2. Navigate to `/admin` in your browser
3. You should see the admin dashboard overview

If redirected to `/dashboard`, verify your admin role was set correctly.

---

## Step 3: Explore Admin Features

### Overview Page (`/admin`)
- View platform statistics
- See recent activity
- Quick links to admin sections

### User Management (`/admin/users`)
- Search and filter users
- Change user roles:
  - `user` - Standard user (default)
  - `moderator` - Enhanced permissions
  - `admin` - Full platform access
- View user profiles
- Delete user accounts

### Community Rooms (`/admin/rooms`)
- Create new discussion rooms
- Archive inactive rooms
- Manage room settings
- View room statistics

### Sessions (`/admin/sessions`)
- Monitor live sessions
- Feature/unfeature sessions
- End sessions if needed
- View session analytics

---

## Admin Role Hierarchy

1. **Admin** (Full Access)
   - All platform features
   - User management
   - Room creation/deletion
   - Session moderation
   - Role assignment

2. **Moderator** (Limited Access)
   - Content moderation
   - User support actions
   - Cannot manage admins
   - Cannot delete critical resources

3. **User** (Standard Access)
   - Standard platform features
   - No admin access

---

## Quick Actions

### Create a Community Room
1. Go to `/admin/rooms`
2. Click "Create Room"
3. Fill in:
   - Room name (auto-generates slug)
   - Select category
   - Choose icon emoji
   - Add description
   - Add tags (optional)
4. Click "Create Room"

### Promote a User to Moderator
1. Go to `/admin/users`
2. Search for the user
3. Click "Edit"
4. Change role to "moderator"
5. Click "Save Changes"

### Feature a Session
1. Go to `/admin/sessions`
2. Find the session
3. Click the star icon
4. Session will appear in featured section

### End a Live Session
1. Go to `/admin/sessions`
2. Filter by "Live Only"
3. Click "End" on the session
4. Confirm the action

---

## API Endpoints (for developers)

All admin endpoints require authentication and admin role.

### Get Your Permissions
```bash
GET /api/auth/permissions
```

### Dashboard Stats
```bash
GET /api/admin/stats
```

### List Users
```bash
GET /api/admin/users?page=1&limit=50
```

### Update User Role
```bash
PATCH /api/admin/users/:userId
Content-Type: application/json

{
  "role": "moderator"
}
```

### Create Room
```bash
POST /api/admin/rooms
Content-Type: application/json

{
  "name": "React Developers",
  "slug": "react-developers",
  "category": "web-dev",
  "description": "Discuss React and web development",
  "icon_emoji": "⚛️",
  "tags": ["react", "javascript", "frontend"]
}
```

---

## Security Best Practices

1. **Limit Admin Accounts:** Only promote trusted users
2. **Review Changes:** Regularly audit admin actions
3. **Use Confirmation:** Always confirm destructive actions
4. **Monitor Activity:** Check the activity feed regularly
5. **Backup Before Bulk Actions:** Always backup before major changes

---

## Troubleshooting

### "Forbidden - Admin access required"
- Verify your role is set to 'admin' in the database
- Clear browser cache and re-login
- Check the profiles table in Supabase

### "Unauthorized" Error
- You are not logged in
- Your session may have expired
- Log in again

### Admin Dashboard Not Loading
- Check browser console for errors
- Verify migration was applied
- Ensure `/admin` route exists

### Cannot Create Room
- Check slug is unique
- Verify all required fields are filled
- Check browser console for validation errors

---

## Support

For issues with the admin dashboard:
1. Check browser console for errors
2. Verify database migration was applied
3. Check Supabase logs for API errors
4. Review the ADMIN_DASHBOARD_SUMMARY.md for details

---

## Next Steps

1. Set yourself as admin using SQL
2. Log in and access `/admin`
3. Create your first community room
4. Invite other moderators/admins as needed
5. Monitor platform activity regularly

Happy administrating!
