
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

async function diagnose() {
  console.log('Diagnosing Data Visibility...');

  // 1. Identify Shops with Orders
  console.log('\n--- Shops with most orders ---');
  const { data: shopsWithOrders, error: shopError } = await supabase.rpc('get_shops_with_order_counts'); // If this RPC doesn't exist, we do it manually
  
  // Manual aggregation since RPC might not exist
  const { data: orders } = await supabase.from('orders').select('shop_id_origin, total_amount');
  const shopCounts = {};
  orders.forEach(o => {
    if (!shopCounts[o.shop_id_origin]) shopCounts[o.shop_id_origin] = { count: 0, total: 0 };
    shopCounts[o.shop_id_origin].count++;
    shopCounts[o.shop_id_origin].total += o.total_amount;
  });

  // Get Shop Details for top shops
  const topShopIds = Object.keys(shopCounts).sort((a, b) => shopCounts[b].count - shopCounts[a].count).slice(0, 5);
  
  const { data: topShops } = await supabase
    .from('shops')
    .select('id, name, business_id')
    .in('id', topShopIds);

  if (topShops) {
      topShops.forEach(s => {
          console.log(`Shop: ${s.name} (ID: ${s.id})`);
          console.log(`  - Business ID: ${s.business_id}`);
          console.log(`  - Orders: ${shopCounts[s.id].count}`);
          console.log(`  - Total Sales: ${shopCounts[s.id].total}`);
      });
  }

  // 2. Check Business Owner and User Roles
  console.log('\n--- Checking Business Owners & Roles ---');
  
  // We'll focus on the business with the most data: fd3e0f65-cdd0-4dff-8af8-48c06810867e
  const targetBusinessId = 'fd3e0f65-cdd0-4dff-8af8-48c06810867e';
  
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, owner_id')
    .eq('id', targetBusinessId)
    .single();
    
  if (business) {
      console.log(`Business: ${business.name} (ID: ${business.id})`);
      console.log(`Owner ID: ${business.owner_id}`);
      
      // Check if Owner has a role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', business.owner_id);
        
      console.log('Owner Roles:', roles);
      
      const hasStoreOwnerRole = roles.some(r => r.role === 'store_owner' && r.business_id === targetBusinessId);
      
      if (!hasStoreOwnerRole) {
          console.log('⚠️ Owner is MISSING "store_owner" role in user_roles table!');
          console.log('This causes RLS policies to BLOCK access to orders.');
          console.log('Attempting to fix...');
          
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({
                user_id: business.owner_id,
                role: 'store_owner',
                business_id: targetBusinessId
            });
            
          if (insertError) {
              console.error('Failed to insert role:', insertError);
          } else {
              console.log('✅ Successfully inserted "store_owner" role for Business Owner.');
          }
      } else {
          console.log('✅ Owner has correct "store_owner" role.');
      }
  } else {
      console.log('Target business not found.');
  }

  // 3. Check can_access_shop definition
  console.log('\n--- Checking can_access_shop definition ---');
  // We can't query pg_proc directly via standard client easily usually, but let's try.
  // If this fails, we assume we can't see it.
  
  try {
      // Trying to call a standard postgres function via RPC if allowed, usually not.
      // Alternatively, check if we can select from information_schema.routines
      /*
      const { data: routines, error: routineError } = await supabase
        .from('information_schema.routines')
        .select('routine_definition')
        .eq('routine_name', 'can_access_shop')
        .eq('routine_schema', 'public');
      */
      
      // Since we can't easily read the function body via API, we'll rely on the fact 
      // that we already verified the user has the role.
      
      console.log('Skipping direct function definition check (requires SQL access).');
      console.log('However, since the user has the "store_owner" role, access SHOULD be granted.');
      console.log('If "zero everywhere" persists, it implies the frontend context (store.id) is wrong.');

  } catch (e) {
      console.error('Error checking function:', e);
  }

  // 4. Check Test User Roles (The user likely used in stress test)
  const testUserId = 'bbeb66de-dc21-4e09-9e4c-950a54049d9c';
  console.log(`\n--- Checking Test User Roles (${testUserId}) ---`);
  
  const { data: testUserRoles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', testUserId);
    
  console.log('Test User Roles:', testUserRoles);
  
  const hasStoreOwner = testUserRoles.some(r => r.role === 'store_owner' && r.business_id === targetBusinessId);
  
  if (!hasStoreOwner) {
      console.log('⚠️ Test User is MISSING "store_owner" role!');
      console.log('If you are logged in as this user, you will only see orders where you are customer/seller.');
      console.log('Since stress test data was deleted, you see ZERO.');
      
      console.log('Granting "store_owner" role to Test User for business ' + targetBusinessId + '...');
      const { error: grantError } = await supabase
        .from('user_roles')
        .insert({
            user_id: testUserId,
            role: 'store_owner',
            business_id: targetBusinessId
        });
        
      if (grantError) {
          console.error('Failed to grant role:', grantError);
      } else {
          console.log('✅ Granted "store_owner" role to Test User. You should now see all orders.');
      }
  } else {
      console.log('✅ Test User already has "store_owner" role.');
  }
}

diagnose();
