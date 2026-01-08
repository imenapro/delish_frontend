import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  step: 'request' | 'verify';
  email: string;
  token?: string;
  newPassword?: string;
  businessId?: string; // Optional context for email branding
}

const getGmailConfig = () => {
  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_PASS");
  if (!user || !pass) return null;
  return {
    name: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    senderName: "BakeSync Security",
    senderEmail: user
  };
};

const sendEmail = async (to: string, code: string, businessId?: string, supabaseAdmin?: any) => {
  // 1. Try Tenant Config first
  let config = null;
  
  if (businessId && supabaseAdmin) {
     const { data: settings } = await supabaseAdmin
        .from('tenant_email_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();
        
     if (settings?.smtp_host) {
        config = {
            name: `Tenant (${settings.sender_name})`,
            host: settings.smtp_host,
            port: settings.smtp_port || 587,
            secure: settings.smtp_port === 465,
            auth: { user: settings.smtp_user, pass: settings.smtp_pass },
            senderName: settings.sender_name,
            senderEmail: settings.sender_email
        };
     }
  }

  // 2. Fallback to Gmail
  if (!config) config = getGmailConfig();

  if (!config) throw new Error("No email provider configured");

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Your verification code is:</p>
      <h1 style="background-color: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px; font-size: 32px;">${code}</h1>
      <p>This code will expire in 15 minutes.</p>
      <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${config.senderName}" <${config.senderEmail}>`,
    to,
    subject: "Reset Your Password - Verification Code",
    html,
    text: `Your password reset code is: ${code}`,
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { step, email, token, newPassword, businessId } = await req.json() as RequestBody;

    if (!email) throw new Error("Email is required");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get User ID from Profiles (using Service Role)
    // We assume 'profiles' table has an entry for every user with matching 'id' and 'email' (if email is synced)
    // Or we can query auth.users if we had access, but typically direct access to auth schema is restricted even for service role via JS client unless using specific admin methods.
    // However, supabaseAdmin.auth.admin.listUsers() is the correct way to find a user by email.
    
    // Find user by email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    // listUsers doesn't filter by email on server side efficiently in all versions, but for single user search:
    // Actually, listUsers() is not ideal for finding ONE user in a large DB.
    // Better: Rely on 'profiles' table which should be synced.
    
    let userId = null;
    
    // Try finding in profiles first
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email) // Assuming email is in profiles, or we join? 
        // Default profiles table usually just has ID. 
        // If profiles doesn't have email, we must use auth admin.
        .maybeSingle();
        
    if (profile) {
        userId = profile.id;
    } else {
        // Fallback: This is expensive if many users, but safe for now. 
        // Or we just assume user doesn't exist.
        // Let's try to get user by email via admin API (if available)
        // Unfortunately getUserById needs ID.
        // We will stick to profiles. If profile not found, we assume user doesn't exist.
        console.log("Profile not found for email:", email);
    }
    
    // If we absolutely can't find the user, return success to prevent enumeration (Fake success)
    if (!userId) {
         console.log("User not found via profile lookup");
         return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (step === 'request') {
      // 1. Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Invalidate old tokens
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('user_id', userId)
        .eq('used', false);

      // 3. Insert new token
      const { error: insertError } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert({
            user_id: userId,
            token: code,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins
            used: false
        });

      if (insertError) {
        console.error("Error storing token:", insertError);
        throw new Error("Failed to generate reset token");
      }

      // 4. Send Email
      await sendEmail(email, code, businessId, supabaseAdmin);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } 
    
    else if (step === 'verify') {
      if (!token || !newPassword) throw new Error("Token and new password are required");

      // 1. Verify Token
      const { data: validToken, error: tokenError } = await supabaseAdmin
        .from('password_reset_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenError || !validToken) {
        throw new Error("Invalid or expired verification code");
      }

      // 2. Mark as used
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('id', validToken.id);

      // 3. Update Password (Admin)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) throw updateError;

      // 4. Log Audit
      await supabaseAdmin.from("audit_logs").insert({
          action: "password_reset_code",
          details: "User reset password via 6-digit code",
          performed_by: userId,
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Invalid step");

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
