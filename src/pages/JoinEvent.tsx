import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Gift, Loader2 } from "lucide-react";

const JoinEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wishlistQ1, setWishlistQ1] = useState("");
  const [wishlistQ2, setWishlistQ2] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: event, isLoading } = useQuery({
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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!event?.registration_open) {
      toast.error("Registration is closed for this event");
      return;
    }

    setLoading(true);

    try {
      // Check if email already registered for this event
      const { data: existingParticipant } = await supabase
        .from("participants")
        .select("id")
        .eq("event_id", eventId)
        .eq("email", email)
        .single();

      if (existingParticipant) {
        toast.error("This email is already registered for this event");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("participants")
        .insert([
          {
            event_id: eventId,
            name,
            email,
            wishlist_q1: wishlistQ1,
            wishlist_q2: wishlistQ2,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send welcome email
      await supabase.functions.invoke("send-welcome-email", {
        body: { participantId: data.id, eventId },
      });

      toast.success("Successfully joined! Check your email for confirmation 🎄");
      navigate(`/event/${eventId}/waiting/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to join event");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event?.registration_open) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-md shadow-festive">
          <CardHeader>
            <CardTitle>Registration Closed</CardTitle>
            <CardDescription>
              Registration for this event is no longer open
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please contact the event host if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Gift className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">{event?.name}</h1>
          <p className="text-muted-foreground">Join the Secret Santa fun!</p>
        </div>

        <Card className="shadow-festive">
          <CardHeader>
            <CardTitle>Register as Participant</CardTitle>
            <CardDescription>
              Fill in your details and wishlist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wishlist1">Wishlist Item 1</Label>
                <Textarea
                  id="wishlist1"
                  placeholder="What would you like to receive?"
                  value={wishlistQ1}
                  onChange={(e) => setWishlistQ1(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wishlist2">Wishlist Item 2</Label>
                <Textarea
                  id="wishlist2"
                  placeholder="Another gift idea..."
                  value={wishlistQ2}
                  onChange={(e) => setWishlistQ2(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-hero hover:opacity-90 transition-all"
                disabled={loading}
              >
                {loading ? "Joining..." : "Join Event 🎁"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinEvent;
