-- Drop the overly complex policy for viewing other users' profiles
DROP POLICY IF EXISTS "Users can view public profile fields only" ON public.profiles;

-- Create a simpler, clearer policy for viewing other users' profiles
CREATE POLICY "Authenticated users can view non-blocked profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() <> id 
  AND is_blocked = false
);