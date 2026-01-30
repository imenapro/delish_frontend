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

async function findActiveUser() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    perPage: 10,
    sortBy: { field: 'last_sign_in_at', direction: 'desc' } // Note: sortBy might not be supported in all versions, but let's try. 
    // Actually listUsers doesn't support sortBy in older versions. 
    // We'll fetch 100 and sort in JS.
  });
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  // Sort manually
  users.sort((a, b) => new Date(b.last_sign_in_at) - new Date(a.last_sign_in_at));

  console.log('--- Most Recent Active Users ---');
  users.slice(0, 10).forEach(u => {
    console.log(`Time: ${u.last_sign_in_at}, Email: ${u.email}, ID: ${u.id}`);
  });
}

findActiveUser();
