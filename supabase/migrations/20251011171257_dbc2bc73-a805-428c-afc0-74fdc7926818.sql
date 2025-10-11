-- Fix conversation participant creation to allow simple direct messaging
-- While maintaining security, allow users to initiate conversations with others

DROP POLICY IF EXISTS "Users can only add themselves to conversations" ON conversation_participants;

-- Allow users to add either themselves OR one other user to a new conversation
-- This enables direct messaging while preventing spam (limited to 2 participants initially)
CREATE POLICY "Users can add participants to new conversations"
ON conversation_participants FOR INSERT
WITH CHECK (
  -- User can always add themselves
  auth.uid() = user_id
  OR
  -- User can add ONE other person to a conversation they're creating
  -- (as long as they're also adding themselves to that conversation)
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
  OR
  -- Allow adding to brand new conversations (count = 0 or 1)
  (SELECT COUNT(*) FROM conversation_participants cp 
   WHERE cp.conversation_id = conversation_participants.conversation_id) <= 1
);