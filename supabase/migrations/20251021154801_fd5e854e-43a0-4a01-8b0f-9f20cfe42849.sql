-- Create storage policies for post-photos bucket
-- Note: We need to use pg_policies to check if they exist first

-- Allow authenticated users to upload post photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload post photos'
  ) THEN
    CREATE POLICY "Users can upload post photos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'post-photos' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Allow public read access to post photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view post photos'
  ) THEN
    CREATE POLICY "Anyone can view post photos"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'post-photos');
  END IF;
END $$;

-- Allow users to delete their own post photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own post photos'
  ) THEN
    CREATE POLICY "Users can delete their own post photos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'post-photos' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;