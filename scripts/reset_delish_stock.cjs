const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.resolve(__dirname, '../.env');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envConfig[key] = value;
    }
  });
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL || envConfig.SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials (VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetStock() {
  console.log('--- Finding Business "Delish" ---');
  
  // 1. Find business
  const { data: businesses, error: bError } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .or('slug.ilike.%delish%,name.ilike.%delish%');
    
  if (bError) {
    console.error('Error finding business:', bError);
    return;
  }

  if (!businesses || businesses.length === 0) {
    console.error('No business found with name/slug containing "delish"');
    return;
  }

  console.log(`Found ${businesses.length} matching business(es):`);
  businesses.forEach(b => console.log(`- ${b.name} (${b.slug}) [${b.id}]`));

  if (businesses.length > 1) {
    console.warn('Multiple businesses found. Updating stock for ALL of them. If this is not intended, please update the script to filter by specific ID.');
  }

  const businessIds = businesses.map(b => b.id);

  // 2. Find shops for these businesses
  console.log('\n--- Finding Shops ---');
  const { data: shops, error: sError } = await supabase
    .from('shops')
    .select('id, name, business_id')
    .in('business_id', businessIds);

  if (sError) {
    console.error('Error finding shops:', sError);
    return;
  }

  if (!shops || shops.length === 0) {
    console.log('No shops found for the matching business(es).');
    return;
  }

  console.log(`Found ${shops.length} shops:`);
  shops.forEach(s => console.log(`- ${s.name} [${s.id}] (Business: ${s.business_id})`));
  
  const shopIds = shops.map(s => s.id);

  // 3. Reset stock in shop_inventory
  console.log('\n--- Resetting Stock to 0 ---');
  
  // Note: Depending on RLS policies, service role should bypass them, 
  // but it's good to be aware. Service role key is used here.
  
  const { data: updated, error: uError } = await supabase
    .from('shop_inventory')
    .update({ stock: 0 })
    .in('shop_id', shopIds)
    .select(); // Select to confirm updates

  if (uError) {
    console.error('Error updating stock:', uError);
    return;
  }

  console.log(`Successfully reset stock to 0 for ${updated ? updated.length : 'unknown number of'} inventory records.`);
  
  // Optional: Check if products exist but have no inventory records (implied 0, but good to know)
  // This script only updates existing inventory records.
}

resetStock();
