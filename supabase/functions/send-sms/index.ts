import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmsRequest {
  phoneNumber: string;
  message: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, message } = await req.json() as SmsRequest;
    
    // Get configuration from environment variables
    const apiKey = Deno.env.get("ESMS_API_KEY");
    const accountId = Deno.env.get("ESMS_ACCOUNT_ID") || "1992";
    // Use "eSMSAfrica" as default since "BakeSync" is invalid/unregistered
    const senderId = Deno.env.get("ESMS_SENDER_ID") || "eSMSAfrica";
    const apiUrl = "https://api.esmsafrica.io/api/sms/send";

    if (!phoneNumber || !message) {
      throw new Error("Phone number and message are required");
    }

    if (!apiKey) {
      console.error("Missing ESMS_API_KEY environment variable");
      throw new Error("SMS service not configured (missing API key)");
    }

    console.log(`Sending SMS to ${phoneNumber} from ${senderId}`);

    // Prepare request to eSMS Africa
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Account-ID": accountId,
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        text: message,
        senderId: senderId,
      }),
    });

    // Handle non-JSON responses (e.g., plain text errors from provider)
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      // If parsing fails, treat the text as the error/result
      console.log("SMS Provider returned non-JSON:", responseText);
      result = { message: responseText, raw: responseText };
    }

    console.log("SMS Provider Response:", result);

    if (!response.ok) {
      // Use the parsed result or the raw text
      const errorMessage = result.reason || result.message || result.error || responseText || response.statusText;
      throw new Error(`SMS Provider Error: ${errorMessage}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error sending SMS:", error);
    // Return 200 even on error so the client can read the error message
    // instead of getting a generic FunctionsHttpError
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
