-- Admin visibility and moderation for activity log

-- Allow admins to view ALL support requests (not just open)
CREATE POLICY "Admins can view all support requests"
ON public.support_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view ALL support request replies
CREATE POLICY "Admins can view all support replies"
ON public.support_request_replies
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any support request
CREATE POLICY "Admins can delete any support request"
ON public.support_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));