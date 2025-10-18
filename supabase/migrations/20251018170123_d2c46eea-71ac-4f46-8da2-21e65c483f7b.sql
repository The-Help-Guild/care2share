-- Remove the old INSERT policy that allows direct inserts
DROP POLICY IF EXISTS "Allow conversation creation via function" ON public.conversations;

-- Create a more restrictive policy that only allows the security definer function to insert
-- The function uses SECURITY DEFINER so it bypasses RLS, but this provides extra safety
CREATE POLICY "Only system can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Make sure the function can still work by granting necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;