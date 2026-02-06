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

async function verifySellerAccess() {
  console.log('Verifying Seller Access...');

  // 1. Find users with 'seller' role
  const { data: sellers, error: sellerError } = await supabase
    .from('user_roles')
    .select('user_id, role, shop_id, business_id')
    .eq('role', 'seller'); // Note: this relies on role column being queryable as text or enum

  if (sellerError) {
    console.error('Error fetching sellers:', sellerError);
    // Try casting if it failed on enum
    const { data: sellersText, error: sellerErrorText } = await supabase
        .from('user_roles')
        .select('user_id, role, shop_id, business_id')
        .filter('role', 'eq', 'seller'); // This might also fail if it's strictly enum
    
    if (sellerErrorText) {
         console.error('Error fetching sellers (retry):', sellerErrorText);
         return;
    }
    console.log(`Found ${sellersText.length} sellers (retry).`);
  } else {
      console.log(`Found ${sellers.length} sellers.`);
      
      for (const seller of sellers) {
          console.log(`\nChecking seller: ${seller.user_id}`);
          console.log(`- Role: ${seller.role}`);
          console.log(`- Assigned Shop ID: ${seller.shop_id}`);
          console.log(`- Business ID: ${seller.business_id}`);

          if (!seller.shop_id) {
              console.warn('⚠️ Seller has NO assigned shop_id!');
              continue;
          }

          // 2. Simulate RLS: Check if this user can see the shop
          // We can't easily simulate "as user" with service key without password.
          // But we can check the logic of the policy:
          // EXISTS (SELECT 1 FROM user_roles WHERE user_id = uid AND shop_id = public.shops.id)
          
          const { data: shop, error: shopError } = await supabase
              .from('shops')
              .select('id, name')
              .eq('id', seller.shop_id)
              .single();
          
          if (shopError) {
              console.error(`- Error fetching shop ${seller.shop_id}:`, shopError);
          } else {
              console.log(`- Assigned Shop exists: ${shop.name} (${shop.id})`);
          }

          // 3. Check Permissions (RBAC)
          // Check if 'seller' role has 'pos.access'
          // We need to check public.role_permissions
          
          // First get role id for 'seller'
          const { data: roleData, error: roleError } = await supabase
              .from('roles')
              .select('id')
              .eq('name', 'seller')
              .single();
              
          if (roleError || !roleData) {
              console.warn('⚠️ Role "seller" not found in public.roles table!');
          } else {
              const { data: perms } = await supabase
                  .from('role_permissions')
                  .select('permission_id, permissions(code)')
                  .eq('role_id', roleData.id);
                  
              const permCodes = perms.map(p => p.permissions.code);
              console.log(`- Permissions for 'seller': ${permCodes.join(', ')}`);
              
              if (!permCodes.includes('pos.access')) {
                  console.error('❌ MISSING "pos.access" permission!');
              } else {
                  console.log('✅ Has "pos.access" permission.');
              }
          }
      }
  }
}

verifySellerAccess();
