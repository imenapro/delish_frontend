const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables manually
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

const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAccess() {
  console.log('Verifying Access for Sellers and Finance (Accountants)...\n');

  await checkRole('seller', 'pos.access');
  await checkRole('accountant', 'pos.access');
  // Manager might also need checking
  await checkRole('manager', 'pos.access');
}

async function checkRole(roleName, requiredPermission) {
  console.log(`--- Checking Role: ${roleName} ---`);

  // 1. Find users with role
  const { data: users, error: userError } = await supabase
    .from('user_roles')
    .select('user_id, role, shop_id, business_id')
    .eq('role', roleName);

  if (userError) {
    console.error(`Error fetching ${roleName}s:`, userError);
    return;
  }

  console.log(`Found ${users.length} users with role '${roleName}'.`);

  // 2. Check Permissions (RBAC)
  const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

  if (roleError || !roleData) {
      console.warn(`⚠️ Role "${roleName}" not found in public.roles table!`);
  } else {
      const { data: perms } = await supabase
          .from('role_permissions')
          .select('permission_id, permissions(code)')
          .eq('role_id', roleData.id);

      const permCodes = perms.map(p => p.permissions.code);
      console.log(`- Permissions for '${roleName}': ${permCodes.join(', ')}`);

      if (!permCodes.includes(requiredPermission)) {
          console.error(`❌ MISSING "${requiredPermission}" permission for ${roleName}!`);      
      } else {
          console.log(`✅ Has "${requiredPermission}" permission.`);
      }
  }
  
  // 3. Sample User Check (Shop Visibility)
  if (users.length > 0) {
      const user = users[0];
      console.log(`- Sample User (${user.user_id}): Shop ID: ${user.shop_id || 'None'}, Business ID: ${user.business_id}`);
      
      // We can't fully simulate RLS as the user without their token,
      // but we can check if the shop exists.
      if (user.shop_id) {
          const { data: shop } = await supabase.from('shops').select('name').eq('id', user.shop_id).single();
          console.log(`  - Assigned Shop: ${shop ? shop.name : 'Unknown'}`);
      } else {
          console.log(`  - No specific shop assigned (relies on Business-wide access).`);
      }
  }
  console.log('');
}

verifyAccess();
