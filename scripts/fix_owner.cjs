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
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOwner() {
  const businessId = 'fd3e0f65-cdd0-4dff-8af8-48c06810867e';
  // Using olntwali2023@gmail.com (ID: 22af472a-681a-4817-9fbe-8cbc6c1c5882)
  // This user has 'store_owner' role.
  const newOwnerId = '22af472a-681a-4817-9fbe-8cbc6c1c5882';

  console.log(`Updating business ${businessId} owner to ${newOwnerId}...`);

  const { data, error } = await supabase
    .from('businesses')
    .update({ owner_id: newOwnerId })
    .eq('id', businessId)
    .select();

  if (error) {
    console.error('Error updating owner:', error);
  } else {
    console.log('Success! New owner set:', data);
  }
}

fixOwner();
