-- Create events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('event', 'announcement')),
  title text NOT NULL,
  description text NOT NULL,
  event_date timestamp with time zone,
  location text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create event_polls table
CREATE TABLE public.event_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

-- Create poll_options table
CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.event_polls(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create poll_votes table
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.event_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Anyone can view events"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "Admins can create events"
ON public.events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update events"
ON public.events FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete events"
ON public.events FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for event_polls
CREATE POLICY "Anyone can view polls"
ON public.event_polls FOR SELECT
USING (true);

CREATE POLICY "Admins can create polls"
ON public.event_polls FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update polls"
ON public.event_polls FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete polls"
ON public.event_polls FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for poll_options
CREATE POLICY "Anyone can view poll options"
ON public.poll_options FOR SELECT
USING (true);

CREATE POLICY "Admins can create poll options"
ON public.poll_options FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete poll options"
ON public.poll_options FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for poll_votes
CREATE POLICY "Users can view all votes"
ON public.poll_votes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can vote"
ON public.poll_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
ON public.poll_votes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
ON public.poll_votes FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();