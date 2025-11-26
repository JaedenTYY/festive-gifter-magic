import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Participant {
  id: string;
  name: string;
  email: string;
  wishlist_q1: string;
  wishlist_q2: string;
}

function generateSecretSantaPairs(participants: Participant[]): Map<string, string> {
  const givers = [...participants];
  let receivers = [...participants];

  // Shuffle receivers using Fisher-Yates algorithm
  for (let i = receivers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
  }

  // Fix self-match issue by reshuffling until valid
  let attempts = 0;
  while (attempts < 100) {
    let valid = true;

    for (let i = 0; i < givers.length; i++) {
      if (givers[i].id === receivers[i].id) {
        valid = false;
        break;
      }
    }

    if (valid) break;

    // Reshuffle
    for (let i = receivers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
    }
    attempts++;
  }

  // Build mapping
  const mapping = new Map<string, string>();
  for (let i = 0; i < givers.length; i++) {
    mapping.set(givers[i].id, receivers[i].id);
  }

  return mapping;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { eventId } = await req.json();
    console.log("Running Secret Santa for event:", eventId);

    // Fetch participants
    const { data: participants, error: fetchError } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", eventId);

    if (fetchError) throw fetchError;

    if (!participants || participants.length < 2) {
      throw new Error("Need at least 2 participants");
    }

    console.log(`Found ${participants.length} participants`);

    // Generate pairings
    const pairings = generateSecretSantaPairs(participants);

    // Delete existing matches for this event (in case of re-draw)
    await supabase.from("matches").delete().eq("event_id", eventId);

    // Insert new matches
    const matchInserts = [];
    for (const [giverId, receiverId] of pairings.entries()) {
      matchInserts.push({
        event_id: eventId,
        giver_id: giverId,
        receiver_id: receiverId,
      });
    }

    const { error: matchError } = await supabase
      .from("matches")
      .insert(matchInserts);

    if (matchError) throw matchError;

    console.log("Assignments saved to database");

    // Send emails
    const emailPromises = [];
    for (const [giverId, receiverId] of pairings.entries()) {
      const giver = participants.find((p) => p.id === giverId);
      const receiver = participants.find((p) => p.id === receiverId);

      if (!giver || !receiver) continue;

      const chatUrl = `${req.headers.get("origin")}/chat/${giverId}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626; text-align: center;">🎄 Your Secret Santa Assignment!</h1>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #059669;">Hi ${giver.name}! 🎁</h2>
            <p>You've been assigned to give a gift to:</p>
            <h3 style="color: #dc2626; font-size: 24px;">${receiver.name}</h3>
          </div>

          <div style="background: #fff; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #059669;">Their Wishlist:</h3>
            <ul style="line-height: 1.8;">
              <li>${receiver.wishlist_q1}</li>
              <li>${receiver.wishlist_q2}</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p>Chat anonymously with your recipient:</p>
            <a href="${chatUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #dc2626, #ef4444); 
                      color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; 
                      font-weight: bold; margin: 10px 0;">
              Open Anonymous Chat 💬
            </a>
          </div>

          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; text-align: center;">
              🎅 Have fun and happy gifting! Merry Christmas! 🎄
            </p>
          </div>
        </div>
      `;

      emailPromises.push(
        resend.emails.send({
          from: "Secret Santa <onboarding@resend.dev>",
          to: [giver.email],
          subject: `🎄 Your Secret Santa Assignment!`,
          html,
        })
      );
    }

    await Promise.all(emailPromises);

    console.log("All emails sent successfully");

    // Mark event as draw completed
    await supabase.from("events").update({ draw_completed: true }).eq("id", eventId);

    return new Response(
      JSON.stringify({ success: true, message: "Secret Santa draw completed!" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in Secret Santa draw:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
