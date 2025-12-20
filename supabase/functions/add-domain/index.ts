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

    const { domain, storeId } = await req.json()

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
    if (origin.includes('dev.delish.rw') || origin.includes('localhost')) {
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

    // 2. Add domain to spec
    if (!spec.domains) {
        spec.domains = [];
    }

    // Check if domain already exists
    const exists = spec.domains.some((d: any) => d.domain === domain);
    if (exists) {
        console.log(`Domain ${domain} already exists in App Spec.`);
        // Just return success if it's already there
        return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Domain already configured.',
              dns_instructions: {
                type: 'CNAME',
                name: domain,
                value: appData.app.default_ingress || 'delish.ondigitalocean.app'
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }

    spec.domains.push({
        domain: domain,
        type: 'ALIAS', // Use ALIAS to avoid replacing the primary domain
        // zone: domain // Optional, usually not needed unless we manage the zone
    });

    console.log(`Updating App Spec with new domain: ${domain}`);

    // 3. Update App
    const updateResponse = await fetch(getUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DO_TOKEN}`,
        },
        body: JSON.stringify({ spec: spec }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('DO API Error (PUT):', updateResponse.status, updateResponse.statusText, errorText)
      throw new Error(`Failed to update App Spec: Status ${updateResponse.status} ${updateResponse.statusText} - Body: ${errorText || '(empty)'}`)
    }

    const updatedAppData = await updateResponse.json()

    // 2. Return instructions or success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Domain added to DigitalOcean. Please configure your DNS records.',
        dns_instructions: {
          type: 'CNAME',
          name: domain, // or www
          value: updatedAppData.app.default_ingress || 'delish.ondigitalocean.app' // This is the value they should point CNAME to
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
