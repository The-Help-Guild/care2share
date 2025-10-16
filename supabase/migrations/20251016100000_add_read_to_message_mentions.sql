-- Add read column to message_mentions table
ALTER TABLE public.message_mentions ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance on read mentions
CREATE INDEX IF NOT EXISTS idx_message_mentions_read ON public.message_mentions(mentioned_user_id, read);

-- Add policy to allow users to update their own mentions (mark as read)
DROP POLICY IF EXISTS "Users can update their own mentions" ON public.message_mentions;
CREATE POLICY "Users can update their own mentions"
  ON public.message_mentions FOR UPDATE
  USING (auth.uid() = mentioned_user_id)
  WITH CHECK (auth.uid() = mentioned_user_id);

-- Enable realtime for message_mentions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_mentions;

