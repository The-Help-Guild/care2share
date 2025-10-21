-- Add photo_url and youtube_url columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Create storage bucket for post photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-photos', 'post-photos', true)
ON CONFLICT (id) DO NOTHING;