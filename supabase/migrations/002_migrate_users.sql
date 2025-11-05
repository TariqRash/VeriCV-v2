-- ============================================================================
-- USER MIGRATION: Django auth_user → Supabase Auth
-- ============================================================================
-- This script migrates existing Django users to Supabase Auth
-- Run this AFTER creating the new schema (001_new_schema.sql)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create mapping table to track Django ID → Supabase UUID
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_migration_mapping (
  django_user_id INTEGER PRIMARY KEY,
  supabase_user_id UUID NOT NULL,
  django_username VARCHAR(150),
  django_email VARCHAR(254),
  migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.user_migration_mapping IS 'Temporary table to map Django user IDs to Supabase UUIDs during migration';

-- ============================================================================
-- STEP 2: Manual User Migration Instructions
-- ============================================================================

-- IMPORTANT: Supabase Auth requires users to set their own passwords
-- You have 2 options:

-- OPTION A: Invite users to set new passwords via email
-- --------------------------------------------------------
-- Run this to send password reset emails to existing users:
--
-- For user 'admin' (admin@vericv.app):
--   1. Go to Supabase Dashboard → Authentication → Users
--   2. Click "Invite User" and enter: admin@vericv.app
--   3. User receives email to set password
--
-- For user 'root' (tariq@ib.com.sa):
--   1. Same process - invite tariq@ib.com.sa
--   2. User receives email to set password

-- OPTION B: Use Supabase Admin API to create users programmatically
-- ------------------------------------------------------------------
-- This is recommended for bulk migrations. See migration script below.

-- ============================================================================
-- STEP 3: Create users in Supabase Auth (Manual approach)
-- ============================================================================

-- After users are created in Supabase Auth via Dashboard or API,
-- create their profiles with original usernames:

-- Example (replace UUIDs with actual ones after user creation):
/*
-- User 1: admin@vericv.app
INSERT INTO public.user_profiles (id, username, full_name, created_at)
VALUES (
  'REPLACE-WITH-ACTUAL-UUID-FROM-SUPABASE-AUTH',
  'admin',
  '',
  '2025-10-29T11:42:50.081839+00:00'
);

INSERT INTO public.user_migration_mapping (django_user_id, supabase_user_id, django_username, django_email)
VALUES (
  1,
  'REPLACE-WITH-ACTUAL-UUID-FROM-SUPABASE-AUTH',
  'admin',
  'admin@vericv.app'
);

-- User 2: tariq@ib.com.sa
INSERT INTO public.user_profiles (id, username, full_name, created_at)
VALUES (
  'REPLACE-WITH-ACTUAL-UUID-FROM-SUPABASE-AUTH',
  'root',
  '',
  '2025-10-29T11:47:20.916093+00:00'
);

INSERT INTO public.user_migration_mapping (django_user_id, supabase_user_id, django_username, django_email)
VALUES (
  2,
  'REPLACE-WITH-ACTUAL-UUID-FROM-SUPABASE-AUTH',
  'root',
  'tariq@ib.com.sa'
);
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if users were created successfully
SELECT
  am.django_user_id,
  am.django_username,
  am.django_email,
  au.id as supabase_uuid,
  au.email,
  au.email_confirmed_at,
  up.username,
  up.full_name
FROM public.user_migration_mapping am
JOIN auth.users au ON au.id = am.supabase_user_id
LEFT JOIN public.user_profiles up ON up.id = am.supabase_user_id;

-- Count migrated users
SELECT
  (SELECT COUNT(*) FROM public.auth_user) as django_users_count,
  (SELECT COUNT(*) FROM public.user_migration_mapping) as migrated_users_count,
  (SELECT COUNT(*) FROM auth.users) as supabase_users_count;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Django Password Hash: Django uses PBKDF2 by default
-- Format: pbkdf2_sha256$260000$<salt>$<hash>
--
-- Supabase Auth uses bcrypt for passwords. Django passwords cannot be
-- directly migrated. Users MUST set new passwords via:
--   1. Password reset email
--   2. Account invitation email
--   3. Admin-created temporary password (then forced reset)

-- ============================================================================
-- END OF USER MIGRATION
-- ============================================================================
