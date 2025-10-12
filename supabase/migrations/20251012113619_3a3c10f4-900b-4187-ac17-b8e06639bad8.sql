-- Add admin moderation policies for posts table

-- Allow admins to delete any post
CREATE POLICY "Admins can delete any post"
ON public.posts
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update any post (e.g., mark as moderated)
CREATE POLICY "Admins can update any post"
ON public.posts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));