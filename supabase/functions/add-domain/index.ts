import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Use Service Role to verify user reliably
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error('Auth Error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError, message: 'Invalid or missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { domain, storeId, appEnv } = await req.json()

    if (!domain || !storeId) {
      throw new Error('Missing domain or storeId')
    }

    // Validate user owns the store (Security check)
    // For now, we assume if they can call this with a valid storeId, they have access
    // But ideally you should query the 'businesses' table to check ownership.

    // Determine which DigitalOcean App to update based on where the request came from
    const origin = req.headers.get('origin') || ''
    let doAppId = (Deno.env.get('DIGITALOCEAN_APP_ID_PROD') || '').trim() // Default to Prod

    // If request comes from dev environment, use Dev App ID
    const isDev = appEnv === 'development' || origin.includes('localhost');
    
    if (isDev) {
      const devId = (Deno.env.get('DIGITALOCEAN_APP_ID_DEV') || '').trim()
      if (devId) {
        console.log('Request from dev environment. Using Dev App ID.')
        doAppId = devId
      }
    }

    const DO_TOKEN = (Deno.env.get('DIGITALOCEAN_ACCESS_TOKEN') || '').trim()

    if (!DO_TOKEN || !doAppId) {
      throw new Error('Server configuration error: Missing DO credentials or App ID')
    }

    // 1. Fetch current App Spec
    const getUrl = `https://api.digitalocean.com/v2/apps/${doAppId}`;
    console.log(`Fetching App Spec from ${getUrl}`);
    
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DO_TOKEN}`,
      },
    });

    if (!getResponse.ok) {
        const errorText = await getResponse.text();
        console.error('DO API Error (GET):', getResponse.status, errorText);
        throw new Error(`Failed to fetch App Spec: ${getResponse.status} ${errorText}`);
    }

    const appData = await getResponse.json();
    const spec = appData.app.spec;

interface AppSpec {
  domains: { domain: string; type: string }[];
  static_sites?: { name: string; catchall_document?: string }[];
}

    // 2. Add domain to spec
    if (!spec.domains) {
        spec.domains = [];
    }

    // Ensure catchall_document is set for SPA routing
    const component = spec.static_sites?.find((s: { name: string; catchall_document?: string }) => s.name === 'delish-frontend');
    if (component && component.catchall_document !== 'index.html') {
        console.log('Enforcing catchall_document: index.html');
        component.catchall_document = 'index.html';
    }

    // Check if domain already exists
    const exists = spec.domains.some((d: { domain: string }) => d.domain === domain);
    if (exists) {
        console.log(`Domain ${domain} already exists in App Spec.`);
    } else {
        spec.domains.push({
            domain: domain,
            type: 'PRIMARY', // or ALIAS
            // zone: 'delish.rw' // If managing DNS here, but likely not needed if just adding domain
        });

        // 3. Update App Spec
        const putUrl = `https://api.digitalocean.com/v2/apps/${doAppId}`;
        console.log(`Updating App Spec at ${putUrl}`);

        const putResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DO_TOKEN}`,
            },
            body: JSON.stringify({ spec }),
        });

        if (!putResponse.ok) {
            const errorText = await putResponse.text();
            console.error('DO API Error (PUT):', putResponse.status, errorText);
            throw new Error(`Failed to update App Spec: ${putResponse.status} ${errorText}`);
        }
        
        console.log('App Spec updated successfully.');
    }

    // 4. Update Supabase Business Record
    console.log(`Linking domain ${domain} to store ${storeId} in Supabase...`);
    const { error: dbError } = await supabaseAdmin
        .from('businesses')
        .update({ custom_domain: domain })
        .eq('id', storeId);

    if (dbError) {
        console.error('Database Update Error:', dbError);
        // Note: We don't throw here because the DO part succeeded, 
        // so we return success but include a warning or log it.
        // Ideally, we might want to rollback DO change, but that's complex.
        // For now, we return a warning.
        return new Response(
            JSON.stringify({ 
                success: true, 
                message: 'Domain added to DigitalOcean, but failed to link in database. Please contact support.',
                warning: dbError.message 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Domain added successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
});
