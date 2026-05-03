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

    if (!email || !password || !name || !role || !businessId) {
      return new Response(JSON.stringify({ error: "Missing required fields in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing invite for: ${email}`);

    // 2. Create or Get User in Auth
    console.log("Step 1: Creating/Getting Auth User...");
    
    let userId: string;
    
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) console.error("Error listing users:", listError.message);
    
    const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      userId = existingUser.id;
      console.log(`User already exists with ID: ${userId}. Updating metadata...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { ...existingUser.user_metadata, name, phone, role, business_id: businessId, shop_id: shopId },
      });
      if (updateError) console.error("Update Metadata Error:", updateError.message);
    } else {
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
      userId = authData.user.id;
      console.log(`New user created with ID: ${userId}`);
    }

    // 3. Create/Update Profile
    console.log("Step 2: Creating Profile...");
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name,
        email,
        phone,
        must_change_password: true,
      });
    if (profileError) {
      console.error("Profile Error details:", profileError);
      throw new Error(`Database error creating profile: ${profileError.message}`);
    }

    // 4. Assign Role
    console.log(`Step 3: Assigning Role [${role}]...`);
    
    // Convert to lowercase to match standard enum values if it's a standard role
    const normalizedRole = role.toLowerCase();
    
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: normalizedRole,
        business_id: businessId,
        shop_id: shopId || null,
      }, { onConflict: 'user_id, role, business_id, shop_id' });
      
    if (roleError) {
      console.error("Role Assignment Error:", roleError);
      // If first attempt fails (maybe due to casing in enum), try original casing
      if (normalizedRole !== role) {
        console.log(`Retrying with original casing: ${role}`);
        const { error: retryError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: role,
            business_id: businessId,
            shop_id: shopId || null,
          }, { onConflict: 'user_id, role, business_id, shop_id' });
        
        if (retryError) {
          throw new Error(`Database error assigning role: ${retryError.message}`);
        }
      } else {
        throw new Error(`Database error assigning role: ${roleError.message}`);
      }
    }

    // 5. Link Business
    console.log("Step 4: Linking Business...");
    const { error: bizError } = await supabase
      .from('user_businesses')
      .upsert({
        user_id: userId,
        business_id: businessId,
      }, { onConflict: 'user_id, business_id' });
    if (bizError) {
      console.error("Business Link Error:", bizError.message);
      throw new Error(`Database error linking business: ${bizError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      userId,
      message: existingUser ? "User updated and linked" : "User created and invited"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
