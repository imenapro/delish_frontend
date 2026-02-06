
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Helper to parse .env file manually
function parseEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = {};
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      const parts = trimmedLine.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        config[key] = value;
      }
    }
    return config;
  } catch (error) {
    console.warn(`Could not read .env file at ${filePath}:`, error.message);
    return {};
  }
}

async function testFinanceModule() {
  const envPath = path.resolve(__dirname, '../.env');
  const envConfig = parseEnv(envPath);
  
  const supabaseUrl = envConfig.VITE_SUPABASE_URL;
  const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('--- Starting Finance Module Test ---');

  // 1. Get a test business
  const { data: businesses, error: businessError } = await supabase
    .from('businesses')
    .select('id, name')
    .limit(1);
    
  if (businessError || !businesses || businesses.length === 0) {
    console.error('Error fetching business or no business found:', businessError);
    return;
  }
  
  const business = businesses[0];
  console.log(`Testing with Business: ${business.name} (${business.id})`);

  // 2. Get shops for this business
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('id, name')
    .eq('business_id', business.id);
    
  if (shopsError) {
    console.error('Error fetching shops:', shopsError);
    return;
  }
  
  const shopIds = shops.map(s => s.id);
  console.log(`Found ${shops.length} shops:`, shopIds);

  if (shops.length === 0) {
    console.log('No shops found for this business. Skipping shop-dependent tests.');
  } else {
    // 3. Test Expenses Table Access
    console.log('\n--- Testing Expenses Table ---');
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .in('shop_id', shopIds)
      .limit(5);
      
    if (expenseError) {
      console.error('Error fetching expenses:', expenseError);
    } else {
      console.log(`Successfully fetched ${expenses.length} expenses.`);
    }

    // 4. Test Orders (Invoices) Access
    console.log('\n--- Testing Orders (Invoices) Access ---');
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .in('shop_id_origin', shopIds)
      .limit(5);
      
    if (orderError) {
      console.error('Error fetching orders:', orderError);
    } else {
      console.log(`Successfully fetched ${orders.length} orders (invoices).`);
    }
  }

  // 5. Test get_sales_analytics RPC
  console.log('\n--- Testing get_sales_analytics RPC ---');
  try {
    const { data: analytics, error: rpcError } = await supabase
      .rpc('get_sales_analytics', { p_business_id: business.id });
      
    if (rpcError) {
      console.error('RPC Error (Expected if migration not applied):', rpcError.message);
      if (rpcError.message.includes('ambiguous')) {
        console.log('Diagnosis: The "column reference created_at is ambiguous" error is present.');
        console.log('Solution: Apply migration 20260206000001_fix_get_sales_analytics_ambiguous_column.sql');
      }
    } else {
      console.log('RPC Call Successful!');
      console.log('Global Stats:', JSON.stringify(analytics.global, null, 2));
    }
  } catch (err) {
    console.error('Unexpected RPC error:', err);
  }

  console.log('\n--- Test Complete ---');
}

testFinanceModule();
