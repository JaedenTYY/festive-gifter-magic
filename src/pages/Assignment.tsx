import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Loader2, MessageCircle } from "lucide-react";

const Assignment = () => {
  const { eventId, participantId } = useParams();
  const navigate = useNavigate();

  const { data: match, isLoading } = useQuery({
    queryKey: ["match", participantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          receiver:participants!matches_receiver_id_fkey(*)
        `)
        .eq("giver_id", participantId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Assignment Yet</CardTitle>
            <CardDescription>
              Wait for the host to run the Secret Santa draw
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const receiver = match.receiver;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-festive">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center">
            <Gift className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl">🎁 Your Secret Santa Assignment!</CardTitle>
          <CardDescription className="text-lg">
            Here's who you're giving a gift to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-hero/10 border-2 border-primary rounded-lg p-6 text-center">
            <h2 className="text-3xl font-bold text-primary mb-2">{receiver.name}</h2>
            <p className="text-muted-foreground">Keep it a secret! 🤫</p>
          </div>

          <div className="bg-accent/10 border border-accent rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-xl flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Their Wishlist
            </h3>
            <div className="space-y-3">
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Wish #1</p>
                <p className="font-medium">{receiver.wishlist_q1}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Wish #2</p>
                <p className="font-medium">{receiver.wishlist_q2}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/chat/${participantId}`)}
              className="w-full bg-gradient-hero hover:opacity-90 transition-all text-lg h-14"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Open Anonymous Chat
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Chat anonymously with your recipient to learn more about their preferences
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
            <p className="text-sm text-center">
              <strong>Remember:</strong> Keep your identity secret and have fun! 🎄
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Assignment;
