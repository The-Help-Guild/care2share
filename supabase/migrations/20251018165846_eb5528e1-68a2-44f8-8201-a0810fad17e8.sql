-- Create a function to start a conversation (checks for existing conversation first)
CREATE OR REPLACE FUNCTION public.start_conversation(target_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_conversation_id uuid;
  new_conversation_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if user is trying to message themselves
  IF current_user_id = target_user THEN
    RAISE EXCEPTION 'Cannot start conversation with yourself';
  END IF;
  
  -- Check if conversation already exists between these two users
  SELECT DISTINCT cp1.conversation_id INTO existing_conversation_id
  FROM conversation_participants cp1
  INNER JOIN conversation_participants cp2 
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id
    AND cp2.user_id = target_user
    AND (
      SELECT COUNT(*) 
      FROM conversation_participants 
      WHERE conversation_id = cp1.conversation_id
    ) = 2;
  
  -- If conversation exists, return it
  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;
  
  -- Create new conversation
  INSERT INTO conversations (id, created_at, updated_at)
  VALUES (gen_random_uuid(), now(), now())
  RETURNING id INTO new_conversation_id;
  
  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conversation_id, current_user_id),
    (new_conversation_id, target_user);
  
  RETURN new_conversation_id;
END;
$$;