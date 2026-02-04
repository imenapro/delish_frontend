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
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNonCashSale() {
  console.log('Starting Non-Cash Sale Test...');

  // 1. Get a user
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError || !users.length) {
    console.error('No users found');
    return;
  }
  const user = users[0];
  console.log(`Using user: ${user.email} (${user.id})`);

  // 2. Find a valid product and its shop
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, business_id, price')
    .eq('is_active', true)
    .limit(1);

  if (prodError || !products.length) {
      console.error('No active products found in the system');
      return;
  }
  const product = products[0];
  console.log(`Using product: ${product.name} (${product.id})`);

  // 3. Get a shop for this product's business
  const { data: shops, error: shopError } = await supabase
    .from('shops')
    .select('id, business_id')
    .eq('business_id', product.business_id)
    .limit(1);
    
  if (shopError || !shops.length) {
    console.error(`No shops found for business ${product.business_id}`);
    return;
  }
  const shop = shops[0];
  console.log(`Using shop: ${shop.id} (Business: ${shop.business_id})`);

  // 4. Create/Get Open Session
  // Close any existing open sessions for this user to be clean
  await supabase.from('pos_sessions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'open');

  const { data: session, error: sessionError } = await supabase
    .from('pos_sessions')
    .insert({
      user_id: user.id,
      shop_id: shop.id,
      business_id: shop.business_id,
      opening_cash: 1000,
      status: 'open',
      opened_at: new Date().toISOString()
    })
    .select()
    .single();

  if (sessionError) {
    console.error('Failed to create session:', sessionError);
    return;
  }
  console.log(`Created session: ${session.id}`);

  // 5. Process 'card' sale
  const saleAmount = 500;
  const items = [{
    product_id: product.id,
    quantity: 1,
    unit_price: saleAmount,
    name: product.name
  }];

  console.log(`Processing 'card' sale for amount: ${saleAmount}...`);
  
  const { data: result, error: rpcError } = await supabase.rpc('process_pos_sale', {
    p_shop_id: shop.id,
    p_user_id: user.id,
    p_session_id: session.id,
    p_total_amount: saleAmount,
    p_payment_method: 'card',
    p_items: items,
    p_customer_phone: null,
    p_extras: {},
    p_tax_amount: 0
  });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
    return;
  }
  console.log('Sale processed successfully:', result.order_code);

  // 6. Verify Session Total
  const { data: updatedSession, error: verifyError } = await supabase
    .from('pos_sessions')
    .select('total_sales, total_orders')
    .eq('id', session.id)
    .single();

  if (verifyError) {
    console.error('Verification Error:', verifyError);
    return;
  }

  console.log('--- Verification Results ---');
  console.log(`Expected Total Sales: ${saleAmount}`);
  console.log(`Actual Total Sales:   ${updatedSession.total_sales}`);
  
  if (Number(updatedSession.total_sales) !== Number(saleAmount)) {
    console.error('FAILURE: Card payment NOT added to total sales.');
    console.error('Expected:', saleAmount, 'Actual:', updatedSession.total_sales);
    console.error('\n*** ACTION REQUIRED ***');
    console.error('The database function process_pos_sale needs to be updated.');
    console.error('Please apply the migration: supabase/migrations/20260204000001_fix_pos_sales_and_backfill.sql');
    process.exit(1);
  } else {
    console.log('SUCCESS: Card payment correctly added to total sales.');
  }
}

testNonCashSale();
