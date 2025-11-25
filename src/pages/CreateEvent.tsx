import { useState } from "react";
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
  const [hostEmail, setHostEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("events")
        .insert([{ name: eventName, host_email: hostEmail }])
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
                <Label htmlFor="hostEmail">Your Email</Label>
                <Input
                  id="hostEmail"
                  type="email"
                  placeholder="host@example.com"
                  value={hostEmail}
                  onChange={(e) => setHostEmail(e.target.value)}
                  required
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
