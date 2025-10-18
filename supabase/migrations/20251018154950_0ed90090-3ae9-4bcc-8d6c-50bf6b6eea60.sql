-- Add policy to allow users to mark their mentions as read
CREATE POLICY "Users can mark their mentions as read"
ON public.message_mentions
FOR UPDATE
TO authenticated
USING (auth.uid() = mentioned_user_id)
WITH CHECK (auth.uid() = mentioned_user_id);