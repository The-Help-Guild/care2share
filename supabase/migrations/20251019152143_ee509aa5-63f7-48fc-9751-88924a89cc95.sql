-- Fix infinite recursion by using security definer function
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view relevant replies" ON support_request_replies;

-- Create a security definer function to check if user can view replies
CREATE OR REPLACE FUNCTION public.can_view_support_reply(_request_id uuid, _user_id uuid, _reply_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User created the support request
    SELECT 1 FROM support_requests WHERE id = _request_id AND user_id = _user_id
  )
  OR _user_id = _reply_user_id
  OR EXISTS (
    -- User has replied to this request
    SELECT 1 FROM support_request_replies 
    WHERE request_id = _request_id AND user_id = _user_id
  )
$$;

-- Create the new policy using the function
CREATE POLICY "Users can view relevant replies" 
ON support_request_replies 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND public.can_view_support_reply(request_id, auth.uid(), user_id)
);