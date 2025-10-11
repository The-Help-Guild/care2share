-- Create support requests table
CREATE TABLE public.support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT title_length CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
  CONSTRAINT description_length CHECK (char_length(description) >= 10 AND char_length(description) <= 5000)
);

-- Create support request replies table
CREATE TABLE public.support_request_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT reply_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 2000)
);

-- Enable RLS on support_requests
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on support_request_replies
ALTER TABLE public.support_request_replies ENABLE ROW LEVEL SECURITY;

-- Policies for support_requests
CREATE POLICY "Users can view all open support requests"
  ON public.support_requests
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own support requests"
  ON public.support_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support requests"
  ON public.support_requests
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own support requests"
  ON public.support_requests
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for support_request_replies
CREATE POLICY "Users can view all replies"
  ON public.support_request_replies
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create replies"
  ON public.support_request_replies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies"
  ON public.support_request_replies
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
  ON public.support_request_replies
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on support_requests
CREATE TRIGGER update_support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better search performance
CREATE INDEX idx_support_requests_title ON public.support_requests USING gin(to_tsvector('english', title));
CREATE INDEX idx_support_requests_description ON public.support_requests USING gin(to_tsvector('english', description));
CREATE INDEX idx_support_requests_category ON public.support_requests(category);
CREATE INDEX idx_support_requests_status ON public.support_requests(status);
CREATE INDEX idx_support_requests_created_at ON public.support_requests(created_at DESC);
CREATE INDEX idx_support_request_replies_request_id ON public.support_request_replies(request_id);