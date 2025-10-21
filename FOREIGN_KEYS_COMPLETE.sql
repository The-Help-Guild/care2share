-- =====================================================
-- FOREIGN KEY CONSTRAINTS - COMPLETE SETUP
-- =====================================================
-- This file adds all necessary foreign key constraints to enable
-- PostgREST embedded queries and enforce referential integrity.
--
-- Run this file in your Supabase SQL Editor.
-- =====================================================

-- =====================================================
-- PHASE 1: DATA CLEANUP
-- Remove orphaned records that would violate constraints
-- =====================================================

-- Clean up posts with invalid user_id
DELETE FROM posts WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up posts with invalid domain_id
DELETE FROM posts WHERE domain_id IS NOT NULL AND domain_id NOT IN (SELECT id FROM domains);

-- Clean up profile_domains with invalid references
DELETE FROM profile_domains WHERE profile_id NOT IN (SELECT id FROM profiles);
DELETE FROM profile_domains WHERE domain_id NOT IN (SELECT id FROM domains);

-- Clean up comments with invalid references
DELETE FROM comments WHERE post_id NOT IN (SELECT id FROM posts);
DELETE FROM comments WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up expertise_tags with invalid profile_id
DELETE FROM expertise_tags WHERE profile_id NOT IN (SELECT id FROM profiles);

-- Clean up hobby_tags with invalid profile_id
DELETE FROM hobby_tags WHERE profile_id NOT IN (SELECT id FROM profiles);

-- Clean up post_likes with invalid references
DELETE FROM post_likes WHERE post_id NOT IN (SELECT id FROM posts);
DELETE FROM post_likes WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up comment_likes with invalid references
DELETE FROM comment_likes WHERE comment_id NOT IN (SELECT id FROM comments);
DELETE FROM comment_likes WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up support_requests with invalid user_id
DELETE FROM support_requests WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up support_request_replies with invalid references
DELETE FROM support_request_replies WHERE request_id NOT IN (SELECT id FROM support_requests);
DELETE FROM support_request_replies WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM support_request_replies WHERE parent_reply_id IS NOT NULL AND parent_reply_id NOT IN (SELECT id FROM support_request_replies);

-- Clean up user_roles with invalid user_id
DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM profiles);
DELETE FROM user_roles WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM profiles);

-- Clean up blocked_users with invalid references
DELETE FROM blocked_users WHERE blocker_user_id NOT IN (SELECT id FROM profiles);
DELETE FROM blocked_users WHERE blocked_user_id NOT IN (SELECT id FROM profiles);

-- Clean up user_reports with invalid references
DELETE FROM user_reports WHERE reporter_id NOT IN (SELECT id FROM profiles);
DELETE FROM user_reports WHERE reported_user_id NOT IN (SELECT id FROM profiles);
DELETE FROM user_reports WHERE reviewed_by IS NOT NULL AND reviewed_by NOT IN (SELECT id FROM profiles);

-- Clean up conversation_participants with invalid references
DELETE FROM conversation_participants WHERE conversation_id NOT IN (SELECT id FROM conversations);
DELETE FROM conversation_participants WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up messages with invalid references
DELETE FROM messages WHERE conversation_id NOT IN (SELECT id FROM conversations);
DELETE FROM messages WHERE sender_id NOT IN (SELECT id FROM profiles);
DELETE FROM messages WHERE reply_to_id IS NOT NULL AND reply_to_id NOT IN (SELECT id FROM messages);

-- Clean up message_mentions with invalid references
DELETE FROM message_mentions WHERE message_id NOT IN (SELECT id FROM messages);
DELETE FROM message_mentions WHERE mentioned_user_id NOT IN (SELECT id FROM profiles);

-- Clean up typing_indicators with invalid references
DELETE FROM typing_indicators WHERE conversation_id NOT IN (SELECT id FROM conversations);
DELETE FROM typing_indicators WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up notifications with invalid user_id
DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up admin_actions with invalid references
DELETE FROM admin_actions WHERE admin_id NOT IN (SELECT id FROM profiles);
DELETE FROM admin_actions WHERE target_user_id IS NOT NULL AND target_user_id NOT IN (SELECT id FROM profiles);

-- Clean up rate_limit_audit with invalid user_id
DELETE FROM rate_limit_audit WHERE user_id NOT IN (SELECT id FROM profiles);

-- =====================================================
-- PHASE 2: ADD FOREIGN KEY CONSTRAINTS
-- Add in dependency order to avoid errors
-- =====================================================

-- -----------------------------------------------------
-- LEVEL 1: Tables referencing profiles and domains
-- -----------------------------------------------------

-- Posts table
ALTER TABLE public.posts
DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

ALTER TABLE public.posts
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.posts
DROP CONSTRAINT IF EXISTS posts_domain_id_fkey;

ALTER TABLE public.posts
ADD CONSTRAINT posts_domain_id_fkey 
FOREIGN KEY (domain_id) 
REFERENCES public.domains(id) 
ON DELETE SET NULL;

-- Profile domains (junction table)
ALTER TABLE public.profile_domains
DROP CONSTRAINT IF EXISTS profile_domains_profile_id_fkey;

ALTER TABLE public.profile_domains
ADD CONSTRAINT profile_domains_profile_id_fkey 
FOREIGN KEY (profile_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.profile_domains
DROP CONSTRAINT IF EXISTS profile_domains_domain_id_fkey;

ALTER TABLE public.profile_domains
ADD CONSTRAINT profile_domains_domain_id_fkey 
FOREIGN KEY (domain_id) 
REFERENCES public.domains(id) 
ON DELETE CASCADE;

-- Expertise tags
ALTER TABLE public.expertise_tags
DROP CONSTRAINT IF EXISTS expertise_tags_profile_id_fkey;

ALTER TABLE public.expertise_tags
ADD CONSTRAINT expertise_tags_profile_id_fkey 
FOREIGN KEY (profile_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Hobby tags
ALTER TABLE public.hobby_tags
DROP CONSTRAINT IF EXISTS hobby_tags_profile_id_fkey;

ALTER TABLE public.hobby_tags
ADD CONSTRAINT hobby_tags_profile_id_fkey 
FOREIGN KEY (profile_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Support requests
ALTER TABLE public.support_requests
DROP CONSTRAINT IF EXISTS support_requests_user_id_fkey;

ALTER TABLE public.support_requests
ADD CONSTRAINT support_requests_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- User roles
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_created_by_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Blocked users
ALTER TABLE public.blocked_users
DROP CONSTRAINT IF EXISTS blocked_users_blocker_user_id_fkey;

ALTER TABLE public.blocked_users
ADD CONSTRAINT blocked_users_blocker_user_id_fkey 
FOREIGN KEY (blocker_user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.blocked_users
DROP CONSTRAINT IF EXISTS blocked_users_blocked_user_id_fkey;

ALTER TABLE public.blocked_users
ADD CONSTRAINT blocked_users_blocked_user_id_fkey 
FOREIGN KEY (blocked_user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- User reports
ALTER TABLE public.user_reports
DROP CONSTRAINT IF EXISTS user_reports_reporter_id_fkey;

ALTER TABLE public.user_reports
ADD CONSTRAINT user_reports_reporter_id_fkey 
FOREIGN KEY (reporter_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.user_reports
DROP CONSTRAINT IF EXISTS user_reports_reported_user_id_fkey;

ALTER TABLE public.user_reports
ADD CONSTRAINT user_reports_reported_user_id_fkey 
FOREIGN KEY (reported_user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.user_reports
DROP CONSTRAINT IF EXISTS user_reports_reviewed_by_fkey;

ALTER TABLE public.user_reports
ADD CONSTRAINT user_reports_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Conversation participants
ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_conversation_id_fkey;

ALTER TABLE public.conversation_participants
ADD CONSTRAINT conversation_participants_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES public.conversations(id) 
ON DELETE CASCADE;

ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;

ALTER TABLE public.conversation_participants
ADD CONSTRAINT conversation_participants_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Notifications
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Admin actions
ALTER TABLE public.admin_actions
DROP CONSTRAINT IF EXISTS admin_actions_admin_id_fkey;

ALTER TABLE public.admin_actions
ADD CONSTRAINT admin_actions_admin_id_fkey 
FOREIGN KEY (admin_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.admin_actions
DROP CONSTRAINT IF EXISTS admin_actions_target_user_id_fkey;

ALTER TABLE public.admin_actions
ADD CONSTRAINT admin_actions_target_user_id_fkey 
FOREIGN KEY (target_user_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Rate limit audit
ALTER TABLE public.rate_limit_audit
DROP CONSTRAINT IF EXISTS rate_limit_audit_user_id_fkey;

ALTER TABLE public.rate_limit_audit
ADD CONSTRAINT rate_limit_audit_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- -----------------------------------------------------
-- LEVEL 2: Tables referencing posts
-- -----------------------------------------------------

-- Comments
ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS comments_post_id_fkey;

ALTER TABLE public.comments
ADD CONSTRAINT comments_post_id_fkey 
FOREIGN KEY (post_id) 
REFERENCES public.posts(id) 
ON DELETE CASCADE;

ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

ALTER TABLE public.comments
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Post likes
ALTER TABLE public.post_likes
DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;

ALTER TABLE public.post_likes
ADD CONSTRAINT post_likes_post_id_fkey 
FOREIGN KEY (post_id) 
REFERENCES public.posts(id) 
ON DELETE CASCADE;

ALTER TABLE public.post_likes
DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;

ALTER TABLE public.post_likes
ADD CONSTRAINT post_likes_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- -----------------------------------------------------
-- LEVEL 3: Tables referencing comments
-- -----------------------------------------------------

-- Comment likes
ALTER TABLE public.comment_likes
DROP CONSTRAINT IF EXISTS comment_likes_comment_id_fkey;

ALTER TABLE public.comment_likes
ADD CONSTRAINT comment_likes_comment_id_fkey 
FOREIGN KEY (comment_id) 
REFERENCES public.comments(id) 
ON DELETE CASCADE;

ALTER TABLE public.comment_likes
DROP CONSTRAINT IF EXISTS comment_likes_user_id_fkey;

ALTER TABLE public.comment_likes
ADD CONSTRAINT comment_likes_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- -----------------------------------------------------
-- LEVEL 4: Tables referencing support_requests
-- -----------------------------------------------------

-- Support request replies (with self-referential FK)
ALTER TABLE public.support_request_replies
DROP CONSTRAINT IF EXISTS support_request_replies_request_id_fkey;

ALTER TABLE public.support_request_replies
ADD CONSTRAINT support_request_replies_request_id_fkey 
FOREIGN KEY (request_id) 
REFERENCES public.support_requests(id) 
ON DELETE CASCADE;

ALTER TABLE public.support_request_replies
DROP CONSTRAINT IF EXISTS support_request_replies_user_id_fkey;

ALTER TABLE public.support_request_replies
ADD CONSTRAINT support_request_replies_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.support_request_replies
DROP CONSTRAINT IF EXISTS support_request_replies_parent_reply_id_fkey;

ALTER TABLE public.support_request_replies
ADD CONSTRAINT support_request_replies_parent_reply_id_fkey 
FOREIGN KEY (parent_reply_id) 
REFERENCES public.support_request_replies(id) 
ON DELETE CASCADE;

-- -----------------------------------------------------
-- LEVEL 5: Tables referencing conversations
-- -----------------------------------------------------

-- Messages (with self-referential FK for replies)
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES public.conversations(id) 
ON DELETE CASCADE;

ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_reply_to_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_reply_to_id_fkey 
FOREIGN KEY (reply_to_id) 
REFERENCES public.messages(id) 
ON DELETE SET NULL;

-- Typing indicators
ALTER TABLE public.typing_indicators
DROP CONSTRAINT IF EXISTS typing_indicators_conversation_id_fkey;

ALTER TABLE public.typing_indicators
ADD CONSTRAINT typing_indicators_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES public.conversations(id) 
ON DELETE CASCADE;

ALTER TABLE public.typing_indicators
DROP CONSTRAINT IF EXISTS typing_indicators_user_id_fkey;

ALTER TABLE public.typing_indicators
ADD CONSTRAINT typing_indicators_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- -----------------------------------------------------
-- LEVEL 6: Tables referencing messages
-- -----------------------------------------------------

-- Message mentions
ALTER TABLE public.message_mentions
DROP CONSTRAINT IF EXISTS message_mentions_message_id_fkey;

ALTER TABLE public.message_mentions
ADD CONSTRAINT message_mentions_message_id_fkey 
FOREIGN KEY (message_id) 
REFERENCES public.messages(id) 
ON DELETE CASCADE;

ALTER TABLE public.message_mentions
DROP CONSTRAINT IF EXISTS message_mentions_mentioned_user_id_fkey;

ALTER TABLE public.message_mentions
ADD CONSTRAINT message_mentions_mentioned_user_id_fkey 
FOREIGN KEY (mentioned_user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- =====================================================
-- PHASE 3: VERIFICATION
-- =====================================================

-- Query to verify all foreign keys are in place
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
-- All foreign key constraints have been added successfully!
-- PostgREST will now be able to perform embedded queries.
-- Your application queries should work without 400 errors.
-- =====================================================
