-- =============================================
-- CONSOLIDATED MIGRATION SCRIPT
-- Export Date: 2025-10-21
-- =============================================
-- This script contains all tables, functions, triggers, and RLS policies
-- Run this on your own Supabase instance

-- =============================================
-- 1. CREATE ENUM TYPES
-- =============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- =============================================
-- 2. CREATE TABLES
-- =============================================

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    bio TEXT,
    profile_photo_url TEXT,
    resume_url TEXT,
    location TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    is_blocked BOOLEAN DEFAULT false,
    blocked_at TIMESTAMP WITH TIME ZONE,
    blocked_by UUID,
    block_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Domains table
CREATE TABLE public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Profile domains junction table
CREATE TABLE public.profile_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    domain_id UUID NOT NULL,
    UNIQUE(profile_id, domain_id)
);

-- Expertise tags
CREATE TABLE public.expertise_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Hobby tags
CREATE TABLE public.hobby_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Posts table
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    photo_url TEXT,
    youtube_url TEXT,
    domain_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Post likes
CREATE TABLE public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(post_id, user_id)
);

-- Comment likes
CREATE TABLE public.comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(comment_id, user_id)
);

-- Conversations table
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Conversation participants
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    reply_to_id UUID,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Message mentions
CREATE TABLE public.message_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    mentioned_user_id UUID NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Typing indicators
CREATE TABLE public.typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Blocked users
CREATE TABLE public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id UUID NOT NULL,
    blocked_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(blocker_user_id, blocked_user_id)
);

-- User reports
CREATE TABLE public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL,
    reported_user_id UUID NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Support requests
CREATE TABLE public.support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Support request replies
CREATE TABLE public.support_request_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_reply_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Admin actions
CREATE TABLE public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    target_user_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Rate limit audit
CREATE TABLE public.rate_limit_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    metadata JSONB,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 3. CREATE VIEWS
-- =============================================

CREATE VIEW public.public_profiles AS
SELECT 
    id,
    full_name,
    bio,
    location,
    profile_photo_url,
    created_at,
    is_blocked
FROM public.profiles
WHERE is_blocked = false;

-- =============================================
-- 4. CREATE FUNCTIONS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Handle updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'moderator' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1
$$;

-- Bootstrap admin (first user becomes admin)
CREATE OR REPLACE FUNCTION public.bootstrap_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) INTO admin_exists;

  IF NOT admin_exists THEN
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'admin', _user_id)
    ON CONFLICT DO NOTHING;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Check if user is conversation participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Start conversation
CREATE OR REPLACE FUNCTION public.start_conversation(target_user UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_conversation_id UUID;
  new_conversation_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id = target_user THEN
    RAISE EXCEPTION 'Cannot start conversation with yourself';
  END IF;
  
  SELECT DISTINCT cp1.conversation_id INTO existing_conversation_id
  FROM conversation_participants cp1
  INNER JOIN conversation_participants cp2 
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id
    AND cp2.user_id = target_user
    AND (
      SELECT COUNT(*) 
      FROM conversation_participants 
      WHERE conversation_id = cp1.conversation_id
    ) = 2;
  
  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;
  
  INSERT INTO conversations (id, created_at, updated_at)
  VALUES (gen_random_uuid(), now(), now())
  RETURNING id INTO new_conversation_id;
  
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conversation_id, current_user_id),
    (new_conversation_id, target_user);
  
  RETURN new_conversation_id;
END;
$$;

-- Check if user can view support reply
CREATE OR REPLACE FUNCTION public.can_view_support_reply(_request_id UUID, _user_id UUID, _reply_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM support_requests WHERE id = _request_id AND user_id = _user_id
  )
  OR _user_id = _reply_user_id
  OR EXISTS (
    SELECT 1 FROM support_request_replies 
    WHERE request_id = _request_id AND user_id = _user_id
  )
$$;

-- Get profile safely (respects privacy and blocking)
CREATE OR REPLACE FUNCTION public.get_profile_safe(profile_id UUID)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  bio TEXT,
  location TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  email TEXT,
  resume_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_blocked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY 
    SELECT 
      p.id, p.full_name, p.bio, p.location, p.profile_photo_url, p.created_at,
      NULL::text as email, NULL::text as resume_url,
      NULL::numeric as latitude, NULL::numeric as longitude,
      p.is_blocked
    FROM profiles p 
    WHERE p.id = profile_id AND p.is_blocked = false;
    RETURN;
  END IF;

  IF auth.uid() = profile_id THEN
    RETURN QUERY 
    SELECT 
      p.id, p.full_name, p.bio, p.location, p.profile_photo_url, p.created_at,
      p.email, p.resume_url, p.latitude, p.longitude, p.is_blocked
    FROM profiles p 
    WHERE p.id = profile_id;
    RETURN;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY 
    SELECT 
      p.id, p.full_name, p.bio, p.location, p.profile_photo_url, p.created_at,
      p.email, p.resume_url, p.latitude, p.longitude, p.is_blocked
    FROM profiles p 
    WHERE p.id = profile_id;
    RETURN;
  END IF;

  RETURN QUERY 
  SELECT 
    p.id, p.full_name, p.bio, p.location, p.profile_photo_url, p.created_at,
    NULL::text as email, NULL::text as resume_url,
    NULL::numeric as latitude, NULL::numeric as longitude,
    p.is_blocked
  FROM profiles p 
  WHERE p.id = profile_id AND p.is_blocked = false;
END;
$$;

-- Clean old typing indicators
CREATE OR REPLACE FUNCTION public.clean_old_typing_indicators()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE created_at < now() - interval '10 seconds';
END;
$$;

-- Clean old rate limits
CREATE OR REPLACE FUNCTION public.clean_old_rate_limits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_audit 
  WHERE created_at < now() - interval '1 hour';
END;
$$;

-- =============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expertise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hobby_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_request_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. CREATE RLS POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own complete profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public profile fields only" ON public.profiles
FOR SELECT USING (
  (auth.uid() IS NOT NULL) AND (auth.uid() <> id) AND 
  ((is_blocked = false) OR (auth.uid() = id) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Domains policies
CREATE POLICY "Domains are viewable by everyone" ON public.domains
FOR SELECT USING (true);

-- Profile domains policies
CREATE POLICY "Profile domains are viewable by everyone" ON public.profile_domains
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile domains" ON public.profile_domains
FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own profile domains" ON public.profile_domains
FOR DELETE USING (auth.uid() = profile_id);

-- Expertise tags policies
CREATE POLICY "Expertise tags are viewable by everyone" ON public.expertise_tags
FOR SELECT USING (true);

CREATE POLICY "Users can manage their own expertise tags" ON public.expertise_tags
FOR ALL USING (auth.uid() = profile_id);

-- Hobby tags policies
CREATE POLICY "Hobby tags are viewable by everyone" ON public.hobby_tags
FOR SELECT USING (true);

CREATE POLICY "Users can manage their own hobby tags" ON public.hobby_tags
FOR ALL USING (auth.uid() = profile_id);

-- User roles policies
CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can assign roles" ON public.user_roles
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Posts policies
CREATE POLICY "Authenticated users can view all posts" ON public.posts
FOR SELECT USING (true);

CREATE POLICY "Public can view admin posts" ON public.posts
FOR SELECT USING (user_id IN (SELECT user_id FROM user_roles WHERE role = 'admin'::app_role));

CREATE POLICY "Users can create their own posts" ON public.posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any post" ON public.posts
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any post" ON public.posts
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Comments policies
CREATE POLICY "Anyone can view comments on visible posts" ON public.comments
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment" ON public.comments
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Post likes policies
CREATE POLICY "Anyone can view post likes" ON public.post_likes
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like posts" ON public.post_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.post_likes
FOR DELETE USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY "Anyone can view comment likes" ON public.comment_likes
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments" ON public.comment_likes
FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
FOR SELECT USING (is_conversation_participant(id, auth.uid()));

CREATE POLICY "Only system can create conversations" ON public.conversations
FOR INSERT WITH CHECK (false);

CREATE POLICY "Users can update their conversations" ON public.conversations
FOR UPDATE USING (is_conversation_participant(id, auth.uid()))
WITH CHECK (is_conversation_participant(id, auth.uid()));

-- Conversation participants policies
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
FOR SELECT USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can add participants to new conversations" ON public.conversation_participants
FOR INSERT WITH CHECK (
  (auth.uid() = user_id) OR 
  is_conversation_participant(conversation_id, auth.uid()) OR 
  ((SELECT count(*) FROM conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id) <= 1)
);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
FOR SELECT USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages to their conversations" ON public.messages
FOR INSERT WITH CHECK ((auth.uid() = sender_id) AND is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can mark received messages as read" ON public.messages
FOR UPDATE USING (is_conversation_participant(conversation_id, auth.uid()) AND (auth.uid() <> sender_id))
WITH CHECK (is_conversation_participant(conversation_id, auth.uid()) AND (auth.uid() <> sender_id));

-- Message mentions policies
CREATE POLICY "Users can view mentions in their conversations" ON public.message_mentions
FOR SELECT USING (
  (auth.uid() = mentioned_user_id) OR 
  (EXISTS (SELECT 1 FROM messages WHERE messages.id = message_mentions.message_id AND messages.sender_id = auth.uid()))
);

CREATE POLICY "Users can create mentions" ON public.message_mentions
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM messages WHERE messages.id = message_mentions.message_id AND messages.sender_id = auth.uid())
);

CREATE POLICY "Users can mark their mentions as read" ON public.message_mentions
FOR UPDATE USING (auth.uid() = mentioned_user_id)
WITH CHECK (auth.uid() = mentioned_user_id);

-- Typing indicators policies
CREATE POLICY "Users can view typing in their conversations" ON public.typing_indicators
FOR SELECT USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can set their own typing status" ON public.typing_indicators
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own typing status" ON public.typing_indicators
FOR DELETE USING (auth.uid() = user_id);

-- Blocked users policies
CREATE POLICY "Users can view their own blocks" ON public.blocked_users
FOR SELECT USING (auth.uid() = blocker_user_id);

CREATE POLICY "Users can block others" ON public.blocked_users
FOR INSERT WITH CHECK ((auth.uid() = blocker_user_id) AND (blocker_user_id <> blocked_user_id));

CREATE POLICY "Users can unblock others" ON public.blocked_users
FOR DELETE USING (auth.uid() = blocker_user_id);

-- User reports policies
CREATE POLICY "Users can view own reports" ON public.user_reports
FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON public.user_reports
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can submit reports" ON public.user_reports
FOR INSERT WITH CHECK ((auth.uid() = reporter_id) AND (reporter_id <> reported_user_id));

CREATE POLICY "Admins can update reports" ON public.user_reports
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Support requests policies
CREATE POLICY "Users can view all open support requests" ON public.support_requests
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all support requests" ON public.support_requests
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own support requests" ON public.support_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support requests" ON public.support_requests
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own support requests" ON public.support_requests
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any support request" ON public.support_requests
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Support request replies policies
CREATE POLICY "Users can view relevant replies" ON public.support_request_replies
FOR SELECT USING ((auth.uid() IS NOT NULL) AND can_view_support_reply(request_id, auth.uid(), user_id));

CREATE POLICY "Admins can view all support replies" ON public.support_request_replies
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create replies" ON public.support_request_replies
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies" ON public.support_request_replies
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies" ON public.support_request_replies
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any reply" ON public.support_request_replies
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin actions policies
CREATE POLICY "Admins can view all admin actions" ON public.admin_actions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can log actions" ON public.admin_actions
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Rate limit audit policies
CREATE POLICY "Users can view their own rate limits" ON public.rate_limit_audit
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can log their own rate limit actions" ON public.rate_limit_audit
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow cleanup of old rate limit records" ON public.rate_limit_audit
FOR DELETE USING (created_at < (now() - '01:00:00'::interval));

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 7. CREATE STORAGE BUCKETS (Run in Supabase Dashboard)
-- =============================================
-- Run these commands in your Supabase Dashboard SQL Editor:

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('profile-photos', 'profile-photos', true);

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('resumes', 'resumes', false);

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('post-photos', 'post-photos', true);

-- =============================================
-- 8. OPTIONAL: INSERT SAMPLE DOMAINS
-- =============================================

INSERT INTO public.domains (name, icon) VALUES
('Technology', '💻'),
('Design', '🎨'),
('Business', '💼'),
('Marketing', '📱'),
('Education', '📚'),
('Healthcare', '⚕️'),
('Finance', '💰'),
('Engineering', '⚙️'),
('Science', '🔬'),
('Arts', '🎭')
ON CONFLICT DO NOTHING;

-- =============================================
-- END OF MIGRATION SCRIPT
-- =============================================
-- Remember to:
-- 1. Enable email auth in Supabase Dashboard
-- 2. Configure auth settings (auto-confirm, etc.)
-- 3. Create storage buckets (see section 7)
-- 4. Set up edge functions separately
-- 5. Configure CORS if needed
-- =============================================
