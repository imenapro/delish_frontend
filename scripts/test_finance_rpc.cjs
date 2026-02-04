const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFinanceAnalytics() {
  console.log('Starting Finance Analytics Test...');

  // 1. Get a valid user for owner_id
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError || !users.length) {
    console.error('No users found to act as owner');
    return;
  }
  const ownerId = users[0].id;

  // 2. Create a Test Business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .insert({
      name: 'Test Analytics Business',
      slug: 'test-analytics-' + Date.now(),
      owner_id: ownerId
    })
    .select()
    .single();

  if (businessError) {
    console.error('Failed to create business:', businessError);
    return;
  }
  console.log('Created business:', business.id);

  try {
    // 3. Create 2 Shops
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .insert([
        { business_id: business.id, name: 'Shop A', slug: 'shop-a-' + Date.now(), address: '123 Test St' },
        { business_id: business.id, name: 'Shop B', slug: 'shop-b-' + Date.now(), address: '456 Test Ave' }
      ])
      .select();

    if (shopsError) throw shopsError;
    const shopA = shops[0];
    const shopB = shops[1];
    console.log('Created shops:', shopA.id, shopB.id);

    // 3. Create Orders
    // Shop A: 
    // - Today: 100
    // - Yesterday (This Week): 200
    // - Last Week (This Month): 400
    
    // Shop B:
    // - Today: 50
    
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today); lastWeek.setDate(lastWeek.getDate() - 5); // Still this week if early enough? 
    // Wait, "This Week" usually starts Monday or Sunday. 
    // Let's use explicit dates relative to now() which the RPC uses.
    
    // To be safe with "This Week" vs "Last 7 days", the RPC uses date_trunc('week', now()).
    // So "Yesterday" might be in the previous week if today is Monday.
    // Let's just test "Today" for simplicity of the first pass, or check the RPC logic.
    // RPC: date_trunc('week', now()) -> Standard Postgres week starts Monday.
    
    const orders = [
      { shop_id: shopA.id, amount: 100, created_at: today.toISOString() },
      { shop_id: shopB.id, amount: 50, created_at: today.toISOString() }
    ];

    for (const o of orders) {
      await supabase.from('orders').insert({
        order_code: 'TEST-' + Math.random(),
        customer_id: business.owner_id,
        seller_id: business.owner_id,
        shop_id_origin: o.shop_id,
        shop_id_fulfill: o.shop_id,
        total_amount: o.amount,
        payment_method: 'cash',
        status: 'confirmed',
        created_at: o.created_at
      });
    }
    console.log('Created orders');

    // 4. Call RPC
    const { data: analytics, error: rpcError } = await supabase
      .rpc('get_sales_analytics', { p_business_id: business.id });

    if (rpcError) {
      console.error('RPC Failed (Migration likely not applied):', rpcError.message);
      console.log('\nPlease apply migration: supabase/migrations/20260204000002_get_sales_analytics_rpc.sql');
      return;
    }

    console.log('RPC Result:', JSON.stringify(analytics, null, 2));

    // 5. Verify
    // Global Daily: 150
    const globalDaily = analytics.global.daily;
    if (globalDaily === 150) {
      console.log('✅ Global Daily correct: 150');
    } else {
      console.error('❌ Global Daily incorrect:', globalDaily);
    }

    // Shop A Daily: 100
    const shopAStats = analytics.shops.find(s => s.shop_id === shopA.id);
    if (shopAStats && shopAStats.daily === 100) {
      console.log('✅ Shop A Daily correct: 100');
    } else {
      console.error('❌ Shop A Daily incorrect:', shopAStats?.daily);
    }

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    // Cleanup
    // await supabase.from('businesses').delete().eq('id', business.id); // Cascade delete
    console.log('Test finished. Cleanup skipped for debugging.');
  }
}

testFinanceAnalytics();
