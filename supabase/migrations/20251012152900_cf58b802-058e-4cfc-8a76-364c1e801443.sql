-- Allow admins to delete any support request reply
CREATE POLICY "Admins can delete any reply"
ON public.support_request_replies
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));