-- Create a secure view for public profile data
-- This prevents email and other sensitive fields from being accessed by other users
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  bio,
  location,
  profile_photo_url,
  created_at,
  is_blocked
FROM public.profiles
WHERE is_blocked = false;

-- Enable RLS on the view
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Create a secure function to get profile data with proper field-level access control
CREATE OR REPLACE FUNCTION public.get_profile_safe(profile_id uuid)
RETURNS TABLE (
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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
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
  -- If admin, return all fields
  ELSIF has_role(auth.uid(), 'admin'::app_role) THEN
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
  -- Otherwise, return only public fields
  ELSE
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
  END IF;
END;
$$;

-- Add length constraints to posts table for data integrity
ALTER TABLE public.posts
ADD CONSTRAINT title_length_check CHECK (char_length(title) <= 200 AND char_length(title) >= 3),
ADD CONSTRAINT content_length_check CHECK (char_length(content) <= 5000 AND char_length(content) >= 10);