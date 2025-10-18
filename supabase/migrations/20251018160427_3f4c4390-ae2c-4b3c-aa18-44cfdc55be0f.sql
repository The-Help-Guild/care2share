-- Ensure messages table has full replica identity for realtime updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;