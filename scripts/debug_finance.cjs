
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    console.log('Loading .env from:', envPath);
    const envContent = fs.readFileSync(envPath, 'utf8');
    // console.log('First 100 chars:', envContent.substring(0, 100));
    const envVars = {};
    envContent.split(/\r?\n/).forEach(line => { // Handle CRLF
      if (!line.trim() || line.startsWith('#')) return; // Skip empty lines and comments
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^"|"$/g, ''); // Remove quotes
      }
    });
    console.log('Loaded keys:', Object.keys(envVars));
    return envVars;
  } catch (error) {
    console.error('Error loading .env file:', error);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
// Use service role key if available to bypass RLS for setup, but we want to test as user
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const adminSupabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

async function debugFinance() {
  console.log('Starting Finance Debug...');

  // 1. Login as store owner (or find one)
  // We'll use admin to find a store owner
  if (!adminSupabase) {
    console.error('Service Role Key required to find users');
    return;
  }

  const { data: { users }, error: userError } = await adminSupabase.auth.admin.listUsers();
  if (userError) {
    console.error('Error listing users:', userError);
    return;
  }

  // Find a user who is a store_owner
  let ownerUser = null;
  let businessId = null;

  for (const user of users) {
    // Check roles
    const { data: roles } = await adminSupabase
      .from('user_roles')
      .select('role, business_id')
      .eq('user_id', user.id);
    
    const ownerRole = roles?.find(r => r.role === 'store_owner');
    if (ownerRole && ownerRole.business_id) {
      ownerUser = user;
      businessId = ownerRole.business_id;
      break;
    }
  }

  if (!ownerUser) {
    console.log('No store_owner found. Creating test data...');
    // Create logic if needed, but for now assuming data exists or we can't test
    return;
  }

  console.log(`Found Owner: ${ownerUser.email} (ID: ${ownerUser.id})`);
  console.log(`Business ID: ${businessId}`);

  // 2. Call RPC as this user (simulate RLS)
  // We can't easily "login" as the user without password.
  // But we can call RPC using service role to verify the FUNCTIONALITY first.
  // If function works with service role, then it's permission issue.
  
  console.log('\n--- Testing RPC get_sales_analytics ---');
  const { data: rpcData, error: rpcError } = await adminSupabase
    .rpc('get_sales_analytics', { p_business_id: businessId });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
  } else {
    console.log('RPC Result:', JSON.stringify(rpcData, null, 2));
  }

  // 3. Check Orders directly
  console.log('--- Checking Orders directly ---');
  const { count: orderCount, error: orderError } = await adminSupabase
    .from('orders')
    .select('*', { count: 'exact', head: true });
  
  if (orderError) console.error('Error counting orders:', orderError);
  else console.log('Total Orders in DB:', orderCount);

  console.log('--- Checking Expenses Table ---');
  const { data: expenses, error: expenseError } = await adminSupabase
    .from('expenses')
    .select('*')
    .limit(1);
    
  if (expenseError) {
    console.error('Error checking expenses table:', expenseError);
  } else {
    console.log('Expenses table exists. Row count sample:', expenses.length);
  }
}

debugFinance().catch(console.error);
