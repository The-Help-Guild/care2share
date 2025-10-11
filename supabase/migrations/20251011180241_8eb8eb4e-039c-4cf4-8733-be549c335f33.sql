-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to new conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can mark received messages as read" ON messages;
DROP POLICY IF EXISTS "Users can view typing in their conversations" ON typing_indicators;

-- Create security definer function to check conversation participation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Recreate conversation_participants policies using the function
CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can add participants to new conversations"
ON conversation_participants FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) OR 
  public.is_conversation_participant(conversation_id, auth.uid()) OR
  ((SELECT count(*) FROM conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id) <= 1)
);

-- Recreate conversations policies using the function
CREATE POLICY "Users can view conversations they participate in"
ON conversations FOR SELECT
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
USING (public.is_conversation_participant(id, auth.uid()))
WITH CHECK (public.is_conversation_participant(id, auth.uid()));

-- Recreate messages policies using the function
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages to their conversations"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND 
  public.is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "Users can mark received messages as read"
ON messages FOR UPDATE
USING (
  public.is_conversation_participant(conversation_id, auth.uid()) AND 
  auth.uid() <> sender_id
)
WITH CHECK (
  public.is_conversation_participant(conversation_id, auth.uid()) AND 
  auth.uid() <> sender_id
);

-- Recreate typing_indicators policy using the function
CREATE POLICY "Users can view typing in their conversations"
ON typing_indicators FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));