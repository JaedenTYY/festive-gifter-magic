import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send, Gift } from "lucide-react";

const AnonymousChat = () => {
  const { participantId } = useParams();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: participant, isLoading: participantLoading } = useQuery({
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
  });

  const { data: match } = useQuery({
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
    enabled: !!participantId,
  });

  const receiver = match?.receiver;
  const matchId = match?.id;

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !matchId || !receiver) return;

    try {
      const { data: newMessage, error } = await supabase
        .from("messages")
        .insert([
          {
            event_id: participant!.event_id,
            match_id: matchId,
            sender_id: participantId,
            recipient_id: receiver.id,
            content: message,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke("send-message-notification", {
        body: { messageId: newMessage.id },
      });

      setMessage("");
      refetch();
      toast.success("Message sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    }
  };

  if (participantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!participant || !match) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center space-y-2 py-4">
          <Gift className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Anonymous Chat</h1>
          <p className="text-muted-foreground">
            Chat with your Secret Santa recipient anonymously
          </p>
        </div>

        <Card className="shadow-festive">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 h-[500px] overflow-y-auto mb-4 p-4">
              {messages && messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_id === participantId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === participantId
                          ? "bg-gradient-hero text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender_id === participantId
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation! 🎄
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button
                type="submit"
                className="bg-gradient-hero hover:opacity-90 transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnonymousChat;
