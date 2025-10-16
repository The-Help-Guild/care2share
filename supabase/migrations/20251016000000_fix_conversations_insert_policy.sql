-- Fix missing INSERT policy for conversations table
-- This was accidentally dropped in migration 20251011180241 and never recreated

-- Add INSERT policy to allow authenticated users to create conversations
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

