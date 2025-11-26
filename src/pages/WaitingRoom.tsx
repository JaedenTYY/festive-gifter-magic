import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Loader2, Users } from "lucide-react";

const WaitingRoom = () => {
  const { eventId, participantId } = useParams();

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: participant } = useQuery({
    queryKey: ["participant", participantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("id", participantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!participantId,
  });

  const { data: match } = useQuery({
    queryKey: ["match", participantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("giver_id", participantId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!participantId,
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // If match exists, redirect to assignment page
  if (match) {
    window.location.href = `/event/${eventId}/assignment/${participantId}`;
    return null;
  }

  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-festive">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center animate-pulse">
            <Gift className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl">Welcome, {participant?.name}! 🎄</CardTitle>
          <CardDescription className="text-lg">
            You've successfully registered for {event?.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-accent/10 border border-accent rounded-lg p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">What's Next?</h3>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li>✅ Your wishlist has been saved</li>
              <li>⏳ Waiting for the host to run the Secret Santa draw</li>
              <li>📧 You'll receive an email once assignments are made</li>
            </ul>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>This page will automatically update when the draw is complete.</p>
            <p className="mt-2">Feel free to close this page - we'll email you!</p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Check your email (including spam folder) for your assignment notification
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitingRoom;
