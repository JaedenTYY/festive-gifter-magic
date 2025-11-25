import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send, Gift } from "lucide-react";

const AnonymousChat = () => {
  const { participantId } = useParams();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: participant } = useQuery({
    queryKey: ["participant", participantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("*, assigned_to:assigned_to_id(*)")
        .eq("id", participantId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", participantId],
    queryFn: async () => {
      if (!participant?.assigned_to_id) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${participantId},recipient_id.eq.${participant.assigned_to_id}),and(sender_id.eq.${participant.assigned_to_id},recipient_id.eq.${participantId})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!participant,
  });

  useEffect(() => {
    if (!participant?.event_id || !participantId || !participant?.assigned_to_id) return;

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `event_id=eq.${participant.event_id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [participant, participantId, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !participant?.assigned_to_id) return;

    try {
      const { error } = await supabase.from("messages").insert([
        {
          event_id: participant.event_id,
          sender_id: participantId,
          recipient_id: participant.assigned_to_id,
          content: message,
        },
      ]);

      if (error) throw error;

      setMessage("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    }
  };

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
