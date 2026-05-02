import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: string;
  businessId: string;
  shopId?: string;
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { email, password, name, phone, role, businessId, shopId } = body;

    console.log(`Processing invite for: ${email}`);

    // 2. Create User in Auth
    console.log("Step 1: Creating Auth User...");
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, role, business_id: businessId, shop_id: shopId },
    });

    if (authError) {
      console.error("Auth Error:", authError.message);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    console.log(`User created with ID: ${userId}`);

    // 3. Create Profile
    console.log("Step 2: Creating Profile...");
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name,
        phone,
        must_change_password: true,
      });
    if (profileError) {
      console.error("Profile Error details:", profileError);
    }

    // 4. Assign Role
    console.log("Step 3: Assigning Role...");
    // Check if user_roles has the right columns
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        business_id: businessId,
        shop_id: shopId || null,
      });
    if (roleError) {
      console.error("Role Assignment Error:", roleError.message);
    }

    // 5. Link Business
    console.log("Step 4: Linking Business...");
    const { error: bizError } = await supabase
      .from('user_businesses')
      .insert({
        user_id: userId,
        business_id: businessId,
      });
    if (bizError) {
      console.error("Business Link Error:", bizError.message);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      userId,
      message: "Staff created successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Global Catch Error:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Check function logs for more info"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
