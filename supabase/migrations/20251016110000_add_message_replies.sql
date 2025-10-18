-- Add reply_to_id column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Create index for better query performance on replies
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Add comment for documentation
COMMENT ON COLUMN public.messages.reply_to_id IS 'Reference to the message this message is replying to (for threaded conversations)';


