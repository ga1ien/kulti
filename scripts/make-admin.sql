-- Script to make a user an admin
-- Usage: Replace 'YOUR_USERNAME_HERE' with the actual username
-- Run this in the Supabase SQL editor

UPDATE profiles
SET role = 'admin'
WHERE username = 'YOUR_USERNAME_HERE';

-- Verify the update
SELECT id, username, display_name, role
FROM profiles
WHERE username = 'YOUR_USERNAME_HERE';

-- List all admins
SELECT id, username, display_name, role
FROM profiles
WHERE role = 'admin';
