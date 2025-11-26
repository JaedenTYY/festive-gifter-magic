-- Add new columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_description TEXT,
ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT TRUE;

-- Create matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  giver_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, giver_id)
);

-- Migrate existing assignments to matches table
INSERT INTO public.matches (event_id, giver_id, receiver_id)
SELECT p.event_id, p.id, p.assigned_to_id
FROM public.participants p
WHERE p.assigned_to_id IS NOT NULL;

-- Enable RLS on matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Create policies for matches (temporary public access - will be secured with auth)
CREATE POLICY "Matches are viewable by everyone" 
ON public.matches 
FOR SELECT 
USING (true);

CREATE POLICY "Matches can be created by anyone" 
ON public.matches 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Matches can be deleted by anyone" 
ON public.matches 
FOR DELETE 
USING (true);

-- Drop the old assigned_to_id column
ALTER TABLE public.participants DROP COLUMN IF EXISTS assigned_to_id;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_event_id ON public.matches(event_id);
CREATE INDEX IF NOT EXISTS idx_matches_giver_id ON public.matches(giver_id);
CREATE INDEX IF NOT EXISTS idx_matches_receiver_id ON public.matches(receiver_id);

-- Update messages table to reference matches
-- First check if match_id column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'match_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id);

-- Enable realtime for matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;