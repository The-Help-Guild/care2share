-- Add parent_reply_id to support_request_replies for nested replies
ALTER TABLE support_request_replies 
ADD COLUMN parent_reply_id uuid REFERENCES support_request_replies(id) ON DELETE CASCADE;

-- Create index for better query performance on nested replies
CREATE INDEX idx_support_request_replies_parent ON support_request_replies(parent_reply_id);

-- Update the can_view_support_reply function to handle nested replies
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
    -- User has replied to this request (including nested replies)
    SELECT 1 FROM support_request_replies 
    WHERE request_id = _request_id AND user_id = _user_id
  )
$$;