-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all replies" ON support_request_replies;

-- Create restricted policy that only allows:
-- 1. Request creator to see all replies
-- 2. Reply authors to see their own replies
-- 3. Anyone who has replied to see all replies in that thread
CREATE POLICY "Users can view relevant replies"
ON support_request_replies
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Request creator can see all replies
    request_id IN (
      SELECT id FROM support_requests WHERE user_id = auth.uid()
    )
    OR
    -- Reply author can see their own reply
    user_id = auth.uid()
    OR
    -- Anyone who has replied to this request can see all replies in that thread
    request_id IN (
      SELECT DISTINCT request_id 
      FROM support_request_replies 
      WHERE user_id = auth.uid()
    )
  )
);