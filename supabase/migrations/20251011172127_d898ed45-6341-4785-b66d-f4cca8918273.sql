-- Add typing indicators, read receipts, and block/report functionality

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation 
ON typing_indicators(conversation_id, created_at);

-- Create blocked_users table for user blocking
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(blocker_user_id, blocked_user_id)
);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Typing indicators policies
CREATE POLICY "Users can view typing in their conversations"
ON typing_indicators FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can set their own typing status"
ON typing_indicators FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own typing status"
ON typing_indicators FOR DELETE
USING (auth.uid() = user_id);

-- Blocked users policies
CREATE POLICY "Users can view their own blocks"
ON blocked_users FOR SELECT
USING (auth.uid() = blocker_user_id);

CREATE POLICY "Users can block others"
ON blocked_users FOR INSERT
WITH CHECK (auth.uid() = blocker_user_id AND blocker_user_id != blocked_user_id);

CREATE POLICY "Users can unblock others"
ON blocked_users FOR DELETE
USING (auth.uid() = blocker_user_id);

-- Create function to clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION clean_old_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE created_at < now() - interval '10 seconds';
END;
$$;

-- Add real-time publication for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;