-- Create rate_limit_audit table for server-side rate limiting
CREATE TABLE rate_limit_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limit_user_action_time 
  ON rate_limit_audit(user_id, action, created_at DESC);

-- Enable RLS
ALTER TABLE rate_limit_audit ENABLE ROW LEVEL SECURITY;

-- Users can only view their own rate limit records
CREATE POLICY "Users can view their own rate limits"
ON rate_limit_audit FOR SELECT
USING (auth.uid() = user_id);

-- Auto-cleanup function for old entries
CREATE OR REPLACE FUNCTION clean_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_audit 
  WHERE created_at < now() - interval '1 hour';
END;
$$;