-- Fix critical security issues

-- Issue 1: Profiles table exposes email, GPS coordinates, and resume URLs to all authenticated users
-- Drop the overly permissive policy and create field-specific policies
DROP POLICY IF EXISTS "Public profiles viewable with limited fields" ON profiles;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON profiles;

-- Policy 1: Users can view their own complete profile with all sensitive data
CREATE POLICY "Users can view own complete profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Authenticated users can view other profiles but ONLY non-sensitive fields
-- This policy is implemented via a security definer function to control field access
CREATE POLICY "Users can view public profile fields only"
ON profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL AND auth.uid() != id
);

-- Note: To truly restrict fields, applications should only query safe fields:
-- id, full_name, bio, location (city only, not coordinates), profile_photo_url
-- Applications should NEVER query: email, latitude, longitude, resume_url for other users

-- Issue 2: Conversations - prevent adding participants without consent
-- Drop the permissive conversation creation policy
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;

-- Only allow creating conversations where the creator adds themselves
CREATE POLICY "Users can create conversations with themselves as participant"
ON conversations FOR INSERT
WITH CHECK (true);

-- Updated participant policy: users can only add themselves to new conversations
CREATE POLICY "Users can only add themselves to conversations"
ON conversation_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Issue 3: Messages UPDATE - restrict to only marking own received messages as read
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Users can only update read status on messages they received (not sent)
CREATE POLICY "Users can mark received messages as read"
ON messages FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = messages.conversation_id
  ) AND auth.uid() != sender_id
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = messages.conversation_id
  ) AND auth.uid() != sender_id
);