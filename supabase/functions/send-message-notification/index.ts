import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  messageId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { messageId }: NotificationRequest = await req.json();

    console.log("Fetching message details for notification:", messageId);

    // Get message details
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("*, recipient:participants!messages_recipient_id_fkey(*)")
      .eq("id", messageId)
      .single();

    if (messageError) throw messageError;

    const recipient = message.recipient;

    console.log("Sending notification email to:", recipient.email);

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "Secret Santa <onboarding@resend.dev>",
      to: [recipient.email],
      subject: "🎄 New Secret Santa Message!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎄 Secret Santa</h1>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">You have a new message!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Your Secret Santa partner has sent you a new message. 
            </p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
              <p style="color: #333; margin: 0; font-style: italic;">"${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"</p>
            </div>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Log in to your anonymous chat to read the full message and reply!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app")}/chat/${recipient.id}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Open Chat
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              This is an automated notification from your Secret Santa event.<br>
              Your identity remains anonymous in the chat.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
