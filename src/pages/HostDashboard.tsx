import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Gift, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const HostDashboard = () => {
  const { eventId } = useParams();
  const [runningDraw, setRunningDraw] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: event, refetch: refetchEvent } = useQuery({
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

  const { data: participants, isLoading, refetch } = useQuery({
    queryKey: ["participants", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("event_id", eventId);

      if (error) throw error;
      return data;
    },
  });

  const joinLink = `${window.location.origin}/event/${eventId}/join`;

  const copyJoinLink = () => {
    navigator.clipboard.writeText(joinLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunDraw = async () => {
    if (!participants || participants.length < 2) {
      toast.error("Need at least 2 participants to run the draw!");
      return;
    }

    setRunningDraw(true);

    try {
      const response = await supabase.functions.invoke("run-secret-santa", {
        body: { eventId },
      });

      if (response.error) throw response.error;

      toast.success("Secret Santa draw completed! Emails sent! 🎄");
      refetch();
      refetchEvent();
    } catch (error: any) {
      toast.error(error.message || "Failed to run draw");
    } finally {
      setRunningDraw(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Gift className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">{event?.name}</h1>
          <p className="text-muted-foreground">Host Dashboard</p>
        </div>

        <Card className="shadow-festive">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Share Join Link</span>
              {event?.draw_completed && (
                <Badge variant="secondary" className="bg-gradient-accent">
                  Draw Completed ✓
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Share this link with participants to join your event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinLink}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
              />
              <Button onClick={copyJoinLink} variant="outline">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-festive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({participants?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants && participants.length > 0 ? (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-muted-foreground">{participant.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No participants yet. Share the join link above!
              </p>
            )}
          </CardContent>
        </Card>

        {participants && participants.length >= 2 && !event?.draw_completed && (
          <Button
            onClick={handleRunDraw}
            className="w-full bg-gradient-hero hover:opacity-90 transition-all text-lg py-6"
            disabled={runningDraw}
          >
            {runningDraw ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Running Secret Santa Draw...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-5 w-5" />
                Run Secret Santa Draw 🎄
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default HostDashboard;
