import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Log for debugging
    console.log('Authorization Header present:', !!req.headers.get('Authorization'));

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth Error:', userError);
      throw new Error('Unauthorized - Invalid or missing token')
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
    let doAppId = Deno.env.get('DIGITALOCEAN_APP_ID_PROD') // Default to Prod

    // If request comes from dev environment, use Dev App ID
    if (origin.includes('dev.delish.rw') || origin.includes('localhost')) {
      const devId = Deno.env.get('DIGITALOCEAN_APP_ID_DEV')
      if (devId) {
        console.log('Request from dev environment. Using Dev App ID.')
        doAppId = devId
      }
    }

    const DO_TOKEN = Deno.env.get('DIGITALOCEAN_ACCESS_TOKEN')

    if (!DO_TOKEN || !doAppId) {
      throw new Error('Server configuration error: Missing DO credentials or App ID')
    }

    // 1. Add Domain to DigitalOcean App
    console.log(`Adding domain ${domain} to App ${doAppId}`)
    
    const response = await fetch(`https://api.digitalocean.com/v2/apps/${doAppId}/domains`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DO_TOKEN}`,
      },
      body: JSON.stringify({
        name: domain,
        // We usually don't set type: 'PRIMARY' immediately to avoid breaking things, 
        // but for a tenant custom domain, it's just an alias.
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DO API Error:', errorText)
      throw new Error(`Failed to add domain to DigitalOcean: ${errorText}`)
    }

    const data = await response.json()

    // 2. Return instructions or success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Domain added to DigitalOcean. Please configure your DNS records.',
        dns_instructions: {
          type: 'CNAME',
          name: domain, // or www
          value: data.domain?.zone_file // or the app default domain
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
