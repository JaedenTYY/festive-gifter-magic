-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  host_email TEXT NOT NULL,
  draw_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  wishlist_q1 TEXT NOT NULL,
  wishlist_q2 TEXT NOT NULL,
  assigned_to_id UUID REFERENCES public.participants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);

-- Create messages table for anonymous chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Public access policies (Secret Santa is public, no auth required)
CREATE POLICY "Events are viewable by everyone"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "Events can be created by anyone"
ON public.events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Events can be updated by anyone"
ON public.events FOR UPDATE
USING (true);

CREATE POLICY "Participants are viewable by everyone"
ON public.participants FOR SELECT
USING (true);

CREATE POLICY "Participants can be created by anyone"
ON public.participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Participants can be updated by anyone"
ON public.participants FOR UPDATE
USING (true);

CREATE POLICY "Messages are viewable by sender and recipient"
ON public.messages FOR SELECT
USING (true);

CREATE POLICY "Messages can be created by anyone"
ON public.messages FOR INSERT
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_participants_event_id ON public.participants(event_id);
CREATE INDEX idx_participants_assigned_to ON public.participants(assigned_to_id);
CREATE INDEX idx_messages_event_id ON public.messages(event_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;