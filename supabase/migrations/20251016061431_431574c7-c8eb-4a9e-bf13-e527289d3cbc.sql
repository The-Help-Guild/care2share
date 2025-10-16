-- Add read column to message_mentions table
ALTER TABLE public.message_mentions ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance on read mentions
CREATE INDEX IF NOT EXISTS idx_message_mentions_read ON public.message_mentions(mentioned_user_id, read);