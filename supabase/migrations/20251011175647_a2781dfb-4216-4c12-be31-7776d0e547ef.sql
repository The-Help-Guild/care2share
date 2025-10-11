-- Add UPDATE policy for conversations table
CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Add storage bucket configuration limits for profile-photos
UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5MB in bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'profile-photos';

-- Add storage bucket configuration limits for resumes
UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB in bytes
  allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'resumes';