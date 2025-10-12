-- Fix 1: Add DELETE policy for rate_limit_audit table cleanup
-- This allows the SECURITY DEFINER cleanup function to delete old records
CREATE POLICY "Allow cleanup of old rate limit records"
ON public.rate_limit_audit
FOR DELETE
USING (created_at < now() - interval '1 hour');

-- Fix 2: Improve get_profile_safe function with null checks and better error handling
CREATE OR REPLACE FUNCTION public.get_profile_safe(profile_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  bio text,
  location text,
  profile_photo_url text,
  created_at timestamp with time zone,
  email text,
  resume_url text,
  latitude numeric,
  longitude numeric,
  is_blocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Add explicit null check for auth.uid()
  IF auth.uid() IS NULL THEN
    -- For unauthenticated requests, return only public profile data if not blocked
    RETURN QUERY 
    SELECT 
      p.id, 
      p.full_name, 
      p.bio, 
      p.location, 
      p.profile_photo_url, 
      p.created_at,
      NULL::text as email,
      NULL::text as resume_url,
      NULL::numeric as latitude,
      NULL::numeric as longitude,
      p.is_blocked
    FROM profiles p 
    WHERE p.id = profile_id AND p.is_blocked = false;
    RETURN;
  END IF;

  -- If requesting own profile, return all fields
  IF auth.uid() = profile_id THEN
    RETURN QUERY 
    SELECT 
      p.id, 
      p.full_name, 
      p.bio, 
      p.location, 
      p.profile_photo_url, 
      p.created_at,
      p.email, 
      p.resume_url,
      p.latitude,
      p.longitude,
      p.is_blocked
    FROM profiles p 
    WHERE p.id = profile_id;
    RETURN;
  END IF;

  -- If admin, return all fields
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY 
    SELECT 
      p.id, 
      p.full_name, 
      p.bio, 
      p.location, 
      p.profile_photo_url, 
      p.created_at,
      p.email, 
      p.resume_url,
      p.latitude,
      p.longitude,
      p.is_blocked
    FROM profiles p 
    WHERE p.id = profile_id;
    RETURN;
  END IF;

  -- Otherwise, return only public fields for non-blocked profiles
  RETURN QUERY 
  SELECT 
    p.id, 
    p.full_name, 
    p.bio, 
    p.location, 
    p.profile_photo_url, 
    p.created_at,
    NULL::text as email,
    NULL::text as resume_url,
    NULL::numeric as latitude,
    NULL::numeric as longitude,
    p.is_blocked
  FROM profiles p 
  WHERE p.id = profile_id AND p.is_blocked = false;
END;
$function$;