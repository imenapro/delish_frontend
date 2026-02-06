
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
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

async function checkUser() {
  console.log('Checking User ID for delish@gmail.com...');

  // Note: auth.users is not directly accessible via standard client unless using service role, which we are.
  let allUsers = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 100 });
      if (error) {
          console.error('Error listing users:', error);
          break;
      }
      if (users.length === 0) {
          hasMore = false;
      } else {
          allUsers = [...allUsers, ...users];
          page++;
      }
  }
  
  console.log(`Total users fetched: ${allUsers.length}`);

  const targetUser = allUsers.find(u => u.email === 'delish@gmail.com');

  if (targetUser) {
      console.log(`Found User: ${targetUser.email}`);
      console.log(`User ID: ${targetUser.id}`);
      
      // Check roles for this user
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', targetUser.id);
        
      console.log('User Roles:', roles);
      
      // Check business access
      const businessId = 'fd3e0f65-cdd0-4dff-8af8-48c06810867e';
      const hasStoreOwner = roles.some(r => r.role === 'store_owner' && r.business_id === businessId);
      const hasSuperAdmin = roles.some(r => r.role === 'super_admin');
      
      console.log(`Has store_owner for target business: ${hasStoreOwner}`);
      console.log(`Has super_admin: ${hasSuperAdmin}`);
      
      if (!hasStoreOwner && !hasSuperAdmin) {
          console.log('⚠️ User lacks permissions! Granting store_owner...');
          
           const { error: grantError } = await supabase
            .from('user_roles')
            .insert({
                user_id: targetUser.id,
                role: 'store_owner',
                business_id: businessId
            });
            
           if (grantError) console.error('Grant failed:', grantError);
           else console.log('✅ Role granted successfully.');
      }
      
  } else {
      console.log('User delish@gmail.com NOT found in auth.users list.');
      console.log('Available users:', users.map(u => u.email));
  }
}

checkUser();
