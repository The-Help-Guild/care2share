-- Connect posts to profiles and domains so embedded selects work
-- Safely add missing foreign keys and helpful indexes

-- 1) posts.user_id -> profiles.id (constraint name used in code: posts_user_id_fkey)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_user_id_fkey'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);

-- 2) posts.domain_id -> domains.id (for embedding domains)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_domain_id_fkey'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_domain_id_fkey
      FOREIGN KEY (domain_id)
      REFERENCES public.domains(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_posts_domain_id ON public.posts(domain_id);
