const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDelish() {
  const businessId = 'fd3e0f65-cdd0-4dff-8af8-48c06810867e';
  const ownerId = 'd82c9f01-5367-494d-b544-310478575470';

  console.log(`Checking Business: ${businessId}`);
  console.log(`Current Owner ID: ${ownerId}`);

  // 1. Check if owner exists in auth.users
  const { data: { user }, error: uError } = await supabase.auth.admin.getUserById(ownerId);
  if (uError) {
      console.log('Error fetching owner:', uError.message);
  } else if (!user) {
      console.log('Owner user NOT FOUND in auth.users!');
  } else {
      console.log(`Owner found: ${user.email}`);
  }

  // 2. Check user_roles for this business
  const { data: roles, error: rError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('business_id', businessId);
    
  if (rError) {
      console.log('Error fetching roles:', rError);
  } else {
      console.table(roles);
  }
}

checkDelish();
