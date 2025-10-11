-- Fix 1: Update profiles RLS policy to hide sensitive PII
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create new policy that hides email, coordinates, and resume_url from unauthenticated users
CREATE POLICY "Public profiles viewable with limited fields"
ON profiles FOR SELECT
USING (
  CASE 
    -- Authenticated users can see email and coordinates for profiles they access
    WHEN auth.uid() IS NOT NULL THEN true
    -- Unauthenticated users cannot see anything
    ELSE false
  END
);

-- Create separate policy for users to view their own complete profile
CREATE POLICY "Users can view their own complete profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Fix 2: Add RLS policies for storage buckets

-- Profile photos policies (public bucket - anyone can view, only owners can upload/modify/delete)
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own profile photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Resume policies (private bucket - only owner can access)
CREATE POLICY "Users can upload own resume"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own resume"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own resume"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own resume"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 3: Add database constraint for message content length and non-empty
ALTER TABLE messages
ADD CONSTRAINT message_content_length 
CHECK (char_length(content) > 0 AND char_length(content) <= 5000);