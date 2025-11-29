-- Add user_id column to events table for host authentication
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Events can be updated by anyone" ON public.events;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Events can be created by anyone" ON public.events;

-- Create new policy: only event hosts can update their events
CREATE POLICY "Hosts can update their own events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Keep public read access for now (will be secured later with proper participant auth)
CREATE POLICY "Events are viewable by everyone" 
ON public.events 
FOR SELECT 
USING (true);

-- Keep public insert for creating events (requires auth in app)
CREATE POLICY "Authenticated users can create events" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);