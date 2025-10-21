-- =====================================================
-- STORAGE BUCKETS EXPORT
-- =====================================================
-- This file contains SQL commands to recreate all storage buckets
-- and their associated RLS policies in your Supabase project.
--
-- INSTRUCTIONS:
-- 1. Run these commands in your Supabase SQL Editor
-- 2. Buckets must be created before policies can be applied
-- 3. Adjust policies as needed for your security requirements
-- =====================================================

-- =====================================================
-- BUCKET CREATION
-- =====================================================

-- Profile Photos Bucket (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Resumes Bucket (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Post Photos Bucket (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-photos',
  'post-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES FOR PROFILE-PHOTOS BUCKET
-- =====================================================

-- Allow public viewing of profile photos
CREATE POLICY "Public Access for Profile Photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own profile photos
CREATE POLICY "Users can update own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own profile photos
CREATE POLICY "Users can delete own profile photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- RLS POLICIES FOR RESUMES BUCKET
-- =====================================================

-- Allow users to view their own resumes
CREATE POLICY "Users can view own resumes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to upload their own resumes
CREATE POLICY "Users can upload own resume"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own resumes
CREATE POLICY "Users can update own resume"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete own resume"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- RLS POLICIES FOR POST-PHOTOS BUCKET
-- =====================================================

-- Allow public viewing of post photos
CREATE POLICY "Public Access for Post Photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-photos');

-- Allow authenticated users to upload post photos
CREATE POLICY "Authenticated users can upload post photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own post photos
CREATE POLICY "Users can update own post photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'post-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own post photos
CREATE POLICY "Users can delete own post photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- ADDITIONAL NOTES
-- =====================================================
-- 
-- File Organization:
-- - Files should be organized in folders by user ID
-- - Example: profile-photos/[user-id]/photo.jpg
-- - Example: resumes/[user-id]/resume.pdf
-- - Example: post-photos/[user-id]/[post-id].jpg
--
-- Security Considerations:
-- - Profile photos are public (anyone can view)
-- - Resumes are private (only owner can view)
-- - Post photos are public (anyone can view)
-- - Users can only upload/modify/delete their own files
--
-- To verify buckets are created, run:
-- SELECT * FROM storage.buckets;
--
-- To verify policies are applied, run:
-- SELECT * FROM pg_policies WHERE tablename = 'objects';
--
-- =====================================================
