-- Fix critical rate limiting issue: Add INSERT policy to rate_limit_audit
CREATE POLICY "Users can log their own rate limit actions"
ON public.rate_limit_audit FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create user_reports table for storing user reports
CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on user_reports
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit reports (but not report themselves)
CREATE POLICY "Users can submit reports"
ON public.user_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id AND reporter_id != reported_user_id);

-- Users can view their own submitted reports
CREATE POLICY "Users can view own reports"
ON public.user_reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.user_reports FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports (for status changes and resolutions)
CREATE POLICY "Admins can update reports"
ON public.user_reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_reports_status ON public.user_reports(status, created_at DESC);
CREATE INDEX idx_reports_reported_user ON public.user_reports(reported_user_id);
CREATE INDEX idx_reports_reporter ON public.user_reports(reporter_id);