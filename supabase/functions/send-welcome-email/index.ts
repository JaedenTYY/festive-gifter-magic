import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { participantId, eventId } = await req.json();
    console.log("Sending welcome email for participant:", participantId);

    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("*")
      .eq("id", participantId)
      .single();

    if (participantError) throw participantError;

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError) throw eventError;

    const waitingRoomUrl = `${req.headers.get("origin")}/event/${eventId}/waiting/${participantId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626; text-align: center;">🎄 Welcome to Secret Santa!</h1>
        
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h2 style="color: #059669;">Hi ${participant.name}! 🎁</h2>
          <p>Thank you for joining <strong>${event.name}</strong>!</p>
        </div>

        <div style="background: #fff; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #059669;">Your Wishlist:</h3>
          <ul style="line-height: 1.8;">
            <li>${participant.wishlist_q1}</li>
            <li>${participant.wishlist_q2}</li>
          </ul>
        </div>

        <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; text-align: center;">
            ⏳ <strong>What's Next?</strong><br/>
            Wait for the host to run the Secret Santa draw.<br/>
            You'll receive another email with your assignment!
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p>Track the status:</p>
          <a href="${waitingRoomUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #dc2626, #ef4444); 
                    color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; 
                    font-weight: bold; margin: 10px 0;">
            Check Waiting Room 🎅
          </a>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "Secret Santa <onboarding@resend.dev>",
      to: [participant.email],
      subject: `🎄 Welcome to ${event.name}!`,
      html,
    });

    console.log("Welcome email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent!" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
