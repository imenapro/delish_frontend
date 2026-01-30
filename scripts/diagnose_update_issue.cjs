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
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- 1. Checking Product State ---');
  // Fetch a few products to see their state
  const { data: products, error: pError } = await supabase
    .from('products')
    .select('id, name, business_id, is_active')
    .limit(5);
  
  if (pError) console.error('Error fetching products:', pError);
  else console.table(products);

  console.log('\n--- 2. Checking RLS Policies on "products" table ---');
  const { data: rawPolicies, error: rawPolError } = await supabase
    .from('pg_policies')
    .select('policyname, cmd, qual, with_check')
    .eq('tablename', 'products');

  if (rawPolError) {
      console.log('Could not query pg_policies directly:', rawPolError.message);
  } else {
      console.log(JSON.stringify(rawPolicies, null, 2));
  }

  console.log('\n--- 3. Checking User Roles ---');
  const { data: roles, error: rError } = await supabase
    .from('user_roles')
    .select('*');
  
  if (rError) console.error('Error fetching roles:', rError);
  else console.table(roles);

  console.log('\n--- 4. Checking Business Linkage ---');
  // Check if there is a mismatch between what the user expects and what is in DB
  const { data: businesses, error: bError } = await supabase
    .from('businesses')
    .select('id, name, owner_id');
    
  if (bError) console.error('Error fetching businesses:', bError);
  else console.table(businesses);
}

diagnose();
