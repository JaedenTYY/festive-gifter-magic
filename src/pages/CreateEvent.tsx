import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Gift, Sparkles } from "lucide-react";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        setHostEmail(session.user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        setHostEmail(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to create an event");
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("events")
        .insert([{ 
          name: eventName, 
          event_description: eventDescription,
          host_email: hostEmail,
          registration_open: true,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Event created successfully! 🎄");
      navigate(`/event/${data.id}/host`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-festive">
          <CardHeader className="text-center">
            <Gift className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to create Secret Santa events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate("/auth")}
              className="w-full bg-gradient-hero hover:opacity-90 transition-all"
            >
              Sign In / Create Account
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Gift className="h-16 w-16 text-primary animate-bounce" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Secret Santa Generator
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            Create magical gift exchanges
          </p>
        </div>

        <Card className="shadow-festive">
          <CardHeader>
            <CardTitle>Create Your Event</CardTitle>
            <CardDescription>
              Start a Secret Santa event and invite participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name</Label>
                <Input
                  id="eventName"
                  placeholder="Christmas Party 2024"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDescription">Event Description (Optional)</Label>
                <Input
                  id="eventDescription"
                  placeholder="Annual office Secret Santa"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostEmail">Your Email</Label>
                <Input
                  id="hostEmail"
                  type="email"
                  placeholder="host@example.com"
                  value={hostEmail}
                  onChange={(e) => setHostEmail(e.target.value)}
                  required
                  disabled
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-hero hover:opacity-90 transition-all"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Event 🎁"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateEvent;
