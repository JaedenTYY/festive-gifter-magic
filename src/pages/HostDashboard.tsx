import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Gift, Copy, Check, Lock, Unlock, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const HostDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [runningDraw, setRunningDraw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [togglingRegistration, setTogglingRegistration] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const toggleRegistration = async () => {
    if (!event) return;
    setTogglingRegistration(true);

    try {
      const { error } = await supabase
        .from("events")
        .update({ registration_open: !event.registration_open })
        .eq("id", eventId);

      if (error) throw error;

      toast.success(
        event.registration_open
          ? "Registration closed"
          : "Registration opened"
      );
      refetchEvent();
    } catch (error: any) {
      toast.error(error.message || "Failed to update registration status");
    } finally {
      setTogglingRegistration(false);
    }
  };

  const handleRunDraw = async (isRerun = false) => {
    if (!participants || participants.length < 2) {
      toast.error("Need at least 2 participants to run the draw!");
      return;
    }

    setRunningDraw(true);

    try {
      // Delete existing matches if re-running
      if (isRerun) {
        await supabase.from("matches").delete().eq("event_id", eventId);
        await supabase.from("messages").delete().eq("event_id", eventId);
      }

      const response = await supabase.functions.invoke("run-secret-santa", {
        body: { eventId },
      });

      if (response.error) throw response.error;

      toast.success(
        isRerun
          ? "Secret Santa re-drawn! New emails sent! 🎄"
          : "Secret Santa draw completed! Emails sent! 🎄"
      );
      refetch();
      refetchEvent();
    } catch (error: any) {
      toast.error(error.message || "Failed to run draw");
    } finally {
      setRunningDraw(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {!user ? (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to access the host dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-gradient-hero hover:opacity-90 transition-all"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}
      </div>
    );
  }

  // Check if user owns this event (optional check for backward compatibility)
  const eventData = event as any;
  if (eventData?.user_id && eventData.user_id !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this event dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/")}
              className="w-full"
              variant="outline"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
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
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>Share Join Link</span>
              <div className="flex items-center gap-2">
                {event?.draw_completed && (
                  <Badge variant="secondary" className="bg-gradient-accent">
                    Draw Completed ✓
                  </Badge>
                )}
                <Badge
                  variant={event?.registration_open ? "default" : "secondary"}
                >
                  {event?.registration_open ? (
                    <>
                      <Unlock className="h-3 w-3 mr-1" />
                      Open
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Closed
                    </>
                  )}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Share this link with participants to join your event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <Button
              onClick={toggleRegistration}
              variant="outline"
              className="w-full"
              disabled={togglingRegistration}
            >
              {togglingRegistration ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : event?.registration_open ? (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Close Registration
                </>
              ) : (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Open Registration
                </>
              )}
            </Button>
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

        {participants && participants.length < 2 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Need at least 2 participants to run the draw. Currently have{" "}
              {participants.length} participant{participants.length !== 1 ? "s" : ""}.
            </AlertDescription>
          </Alert>
        )}

        {participants && participants.length >= 2 && !event?.draw_completed && (
          <Button
            onClick={() => handleRunDraw(false)}
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

        {event?.draw_completed && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full text-lg py-6 border-2"
                disabled={runningDraw}
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Re-run Draw (New Assignments)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Re-run Secret Santa Draw?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all existing assignments and messages, create new random
                  pairings, and send new assignment emails to all participants. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleRunDraw(true)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Re-run Draw
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

export default HostDashboard;
