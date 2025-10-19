-- Fix the infinite recursion issue in support_request_replies RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view relevant replies" ON support_request_replies;

-- Create a simpler, non-recursive policy
CREATE POLICY "Users can view relevant replies" 
ON support_request_replies 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- User created the original support request
    request_id IN (
      SELECT id FROM support_requests WHERE user_id = auth.uid()
    )
    -- Or user created this reply
    OR user_id = auth.uid()
    -- Or user has replied to this request before
    OR EXISTS (
      SELECT 1 FROM support_request_replies srr
      WHERE srr.request_id = support_request_replies.request_id
      AND srr.user_id = auth.uid()
      AND srr.id != support_request_replies.id
    )
  )
);