-- Add terms acceptance tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN terms_accepted_at timestamp with time zone;

-- Add comment explaining GDPR compliance
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp when user accepted terms and privacy policy (GDPR compliance)';