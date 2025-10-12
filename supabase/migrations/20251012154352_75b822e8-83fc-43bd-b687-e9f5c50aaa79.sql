-- Allow unauthenticated users to view posts from admins as welcome messages
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

CREATE POLICY "Authenticated users can view all posts"
ON public.posts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Public can view admin posts"
ON public.posts
FOR SELECT
TO anon
USING (
  user_id IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'admin'::app_role
  )
);