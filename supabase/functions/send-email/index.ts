import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  businessId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attachments?: any[];
}

interface ServiceConfig {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  senderName?: string;
  senderEmail?: string;
}

const getGmailConfig = (): ServiceConfig | null => {
  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_PASS");
  
  if (!user || !pass) return null;

  return {
    name: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    senderName: "BakeSync",
    senderEmail: user
  };
};

const getFallbackConfig = (): ServiceConfig | null => {
  // Example fallback: Mailtrap or SendGrid
  // Users can set FALLBACK_SMTP_HOST, etc.
  const host = Deno.env.get("FALLBACK_SMTP_HOST");
  const port = parseInt(Deno.env.get("FALLBACK_SMTP_PORT") || "587");
  const user = Deno.env.get("FALLBACK_SMTP_USER");
  const pass = Deno.env.get("FALLBACK_SMTP_PASS");

  if (!host || !user || !pass) return null;

  return {
    name: "Fallback (Custom)",
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    senderName: "BakeSync",
    senderEmail: user
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, text, attachments, businessId } = await req.json() as EmailRequest;

    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Rate Limiting Check (100 emails/hour per tenant)
    if (businessId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabaseAdmin
          .from('email_logs')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('created_at', oneHourAgo);
      
      if (!countError && count !== null && count >= 100) {
          throw new Error("Email rate limit exceeded (100 emails/hour). Please try again later.");
      }
    }

    // Initialize providers
    const providers: ServiceConfig[] = [];
    
    // 1. Try Tenant Config if businessId is provided
    if (businessId) {
      try {
        const { data: settings, error } = await supabaseAdmin
            .from('tenant_email_settings')
            .select('*')
            .eq('business_id', businessId)
            .maybeSingle();

        if (error) {
           console.error("Error fetching tenant settings:", error);
        }
            
        if (settings && settings.smtp_host && settings.smtp_user && settings.smtp_pass) {
             providers.push({
                name: `Tenant (${settings.sender_name})`,
                host: settings.smtp_host,
                port: settings.smtp_port || 587,
                secure: settings.smtp_port === 465,
                auth: {
                    user: settings.smtp_user,
                    pass: settings.smtp_pass
                },
                senderName: settings.sender_name,
                senderEmail: settings.sender_email
             });
             console.log(`Loaded tenant email configuration for business ${businessId}`);
        }
      } catch (err) {
        console.error("Failed to load tenant config:", err);
      }
    }

    const gmailConfig = getGmailConfig();
    if (gmailConfig) providers.push(gmailConfig);
    
    const fallbackConfig = getFallbackConfig();
    if (fallbackConfig) providers.push(fallbackConfig);

    if (providers.length === 0) {
      throw new Error("No email providers configured. Please set GMAIL_USER/GMAIL_PASS or fallback credentials.");
    }

    let lastError: Error | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sentInfo: any = null;
    let usedProvider: ServiceConfig | null = null;

    // Try each provider in order
    for (const config of providers) {
      try {
        console.log(`Attempting to send email via ${config.name}...`);
        
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.auth,
        });

        // Verify connection first
        await transporter.verify();
        console.log(`${config.name} connection verified.`);
        
        const fromAddress = config.senderName && config.senderEmail 
            ? `"${config.senderName}" <${config.senderEmail}>`
            : config.auth.user;

        const mailOptions = {
          from: fromAddress, 
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback text generation
          attachments,
          headers: {
             ...(businessId ? { 'X-Tenant-ID': businessId } : {}),
             'X-Sender-Type': config.name.includes('Tenant') ? 'Tenant' : 'System'
          }
        };

        sentInfo = await transporter.sendMail(mailOptions);
        usedProvider = config;

        console.log(`Email sent successfully via ${config.name}:`, sentInfo.messageId);
        
        // Log Success
        await supabaseAdmin.from('email_logs').insert({
            business_id: businessId || null,
            from_email: config.senderEmail || config.auth.user,
            to_email: Array.isArray(to) ? to.join(',') : to,
            subject: subject,
            status: 'sent',
            provider: config.name,
            metadata: { messageId: sentInfo.messageId }
        });

        break; // Success! Exit loop.
      } catch (error) {
        console.error(`Failed to send via ${config.name}:`, error instanceof Error ? error.message : String(error));
        lastError = error instanceof Error ? error : new Error(String(error));
        // Continue to next provider
      }
    }

    if (!sentInfo) {
      // Log Failure
      await supabaseAdmin.from('email_logs').insert({
          business_id: businessId || null,
          from_email: 'unknown', // Could not determine
          to_email: Array.isArray(to) ? to.join(',') : to,
          subject: subject,
          status: 'failed',
          error_message: lastError?.message || "All providers failed",
          provider: 'all'
      });

      throw new Error(`All email providers failed. Last error: ${lastError?.message || "Unknown error"}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: sentInfo.messageId,
      provider: sentInfo.accepted ? "SMTP" : "Unknown" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 400, // or 500 depending on error
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
