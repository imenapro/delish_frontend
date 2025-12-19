import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, name, phone } = await req.json() as InviteRequest;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    console.log(`Sending credentials to ${email} (Phone: ${phone})`);

    let emailSent = false;
    let emailResult = null;

    if (resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "BakeSync <onboarding@resend.dev>",
          to: [email],
          subject: "Welcome to BakeSync - Your Credentials",
          html: `
            <h1>Welcome to BakeSync, ${name}!</h1>
            <p>You have been invited to join the team.</p>
            <p><strong>Your login email:</strong> ${email}</p>
            <p><strong>Your temporary password:</strong> ${password}</p>
            <p>Please login and change your password immediately.</p>
          `,
        }),
      });
      emailResult = await res.json();
      emailSent = res.ok;
    } else {
      console.log("No RESEND_API_KEY found. Skipping email.");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailSent,
      message: emailSent ? "Credentials sent via email" : "Email service not configured" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
