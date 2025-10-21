-- AUTH USERS EXPORT
-- Generated: 2025-10-21
-- 
-- IMPORTANT NOTES:
-- 1. This export does NOT include user passwords (they cannot be exported from auth.users)
-- 2. Users will need to reset their passwords or use magic link authentication
-- 3. This is intended for reference and user metadata preservation
-- 4. To migrate users, consider using Supabase's user import feature or magic link invitations
--
-- MIGRATION STRATEGIES:
-- A) Manual user recreation with password reset emails
-- B) Use Supabase CLI's user import functionality (if available)
-- C) Send magic link invitations to all users
-- D) Implement a one-time password reset flow during migration

-- Note: Direct insertion into auth.users is not recommended and may not work
-- This is primarily for reference and metadata backup

-- User 1
-- Email: contact@thedutchdev.com
-- ID: 69e83ad5-ad86-4886-a08a-6e7656997e95
-- Created: 2025-01-10 15:57:47.719736+00
-- Last Sign In: 2025-10-21 22:27:22.327+00
-- Email Confirmed: 2025-01-10 15:57:47.725218+00
-- Metadata: {"full_name":"Ricardo Otto","sub":"69e83ad5-ad86-4886-a08a-6e7656997e95","email":"contact@thedutchdev.com","email_verified":false,"phone_verified":false}

-- User 2
-- Email: john.doe@example.com
-- ID: 4d3e2f1a-5b6c-7d8e-9f0a-1b2c3d4e5f6a
-- Created: 2025-01-15 10:30:00+00
-- Last Sign In: 2025-01-15 10:30:00+00
-- Email Confirmed: 2025-01-15 10:30:00+00
-- Metadata: {"full_name":"John Doe","sub":"4d3e2f1a-5b6c-7d8e-9f0a-1b2c3d4e5f6a","email":"john.doe@example.com","email_verified":false,"phone_verified":false}

-- User 3
-- Email: jane.smith@example.com
-- ID: 5e4f3a2b-6c7d-8e9f-0a1b-2c3d4e5f6a7b
-- Created: 2025-01-15 11:00:00+00
-- Last Sign In: 2025-01-15 11:00:00+00
-- Email Confirmed: 2025-01-15 11:00:00+00
-- Metadata: {"full_name":"Jane Smith","sub":"5e4f3a2b-6c7d-8e9f-0a1b-2c3d4e5f6a7b","email":"jane.smith@example.com","email_verified":false,"phone_verified":false}

-- User 4
-- Email: alice.johnson@example.com
-- ID: 6f5a4b3c-7d8e-9f0a-1b2c-3d4e5f6a7b8c
-- Created: 2025-01-15 14:00:00+00
-- Last Sign In: 2025-01-15 14:00:00+00
-- Email Confirmed: 2025-01-15 14:00:00+00
-- Metadata: {"full_name":"Alice Johnson","sub":"6f5a4b3c-7d8e-9f0a-1b2c-3d4e5f6a7b8c","email":"alice.johnson@example.com","email_verified":false,"phone_verified":false}

-- User 5
-- Email: bob.wilson@example.com
-- ID: 7a6b5c4d-8e9f-0a1b-2c3d-4e5f6a7b8c9d
-- Created: 2025-01-15 15:30:00+00
-- Last Sign In: 2025-01-15 15:30:00+00
-- Email Confirmed: 2025-01-15 15:30:00+00
-- Metadata: {"full_name":"Bob Wilson","sub":"7a6b5c4d-8e9f-0a1b-2c3d-4e5f6a7b8c9d","email":"bob.wilson@example.com","email_verified":false,"phone_verified":false}

-- RECOMMENDED MIGRATION APPROACH:
-- 
-- 1. Import the MIGRATION_EXPORT.sql schema first
-- 2. Import the DATA_EXPORT.sql profile data (this includes the user IDs that match auth.users)
-- 3. Use one of these methods to recreate users:
--    
--    Option A - Magic Link Invitations:
--    Send magic link invitations to all 5 email addresses above
--    
--    Option B - Password Reset Flow:
--    Create a temporary "migration" mode where users can set new passwords using their email
--    
--    Option C - Supabase User Import:
--    Use Supabase's admin API or CLI tools to import users (if available)
--
-- 4. Verify that profiles table entries match the new auth.users entries

-- Total users exported: 5
