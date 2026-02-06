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
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserAccess() {
    const email = 'delish@gmail.com';
    console.log(`Checking access for user: ${email}`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }
    
    console.log(`Total users found: ${users.length}`);
    const emails = users.map(u => u.email);
    console.log('Available emails:', emails);
    
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
        console.error('User not found!');
        return;
    }
    
    console.log(`User ID: ${user.id}`);

    // 2. Check Roles
    const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
        
    if (rolesError) {
        console.error('Error fetching roles:', rolesError);
    } else {
        console.log('User Roles:', roles);
    }

    // 3. Check Shops (Admin view - all shops)
    const { data: allShops } = await supabase.from('shops').select('id, name, business_id');
    console.log(`Total shops in DB: ${allShops?.length}`);

    // 4. Simulate RLS for Shops
    // We can't actually run a query *as* the user easily here without their password,
    // but we can check the logic.
    // Logic usually is: has_role(super_admin) OR user_roles.shop_id = shop.id OR business check.
    
    // Let's check if there are any shops associated with this user directly
    const userShopIds = roles?.map(r => r.shop_id).filter(Boolean) || [];
    const userBusinessIds = roles?.map(r => r.business_id).filter(Boolean) || [];
    
    console.log('Explicit Shop IDs in roles:', userShopIds);
    console.log('Explicit Business IDs in roles:', userBusinessIds);

    // 5. Check Orders for these shops
    if (allShops && allShops.length > 0) {
        const shopIds = allShops.map(s => s.id);
        const { count, error: countError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('shop_id_origin', shopIds); // Check global count first
            
        console.log(`Total orders in DB for all shops: ${count}`);
    }

    // 6. Check Business Specific Data
    const businessId = 'fd3e0f65-cdd0-4dff-8af8-48c06810867e';
    console.log(`\n--- Checking Business: ${businessId} ---`);
    
    const { data: businessShops } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', businessId);
        
    console.log(`Shops for this business: ${businessShops?.length}`);
    if (businessShops?.length > 0) {
        businessShops.forEach(s => console.log(` - ${s.name} (${s.id})`));
        
        const shopIds = businessShops.map(s => s.id);
        const { count: orderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('shop_id_origin', shopIds);
            
        console.log(`Orders for these shops: ${orderCount}`);
        
        // Check recent orders
        const { data: recentOrders } = await supabase
            .from('orders')
            .select('id, created_at, total_amount, shop_id_origin')
            .in('shop_id_origin', shopIds)
            .order('created_at', { ascending: false })
            .limit(5);
            
        console.log('Recent 5 orders:', recentOrders);
    } else {
        console.log('No shops found for this business.');
    }
}

checkUserAccess();
