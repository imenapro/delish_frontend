import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
let SUPABASE_URL = '';
let SUPABASE_SERVICE_ROLE_KEY = '';

try {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      const cleanValue = value.replace(/"/g, '').trim();
      if (key.trim() === 'SUPABASE_URL') SUPABASE_URL = cleanValue;
      if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_ROLE_KEY = cleanValue;
    }
  });
} catch (e) {
  console.error('Error reading .env file:', e);
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runTest() {
  console.log('Starting Cascade Delete Verification...');
  
  // 1. Create a User (for order/shop owner)
  const testEmail = `cascade_test_${Date.now()}@example.com`;
  const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: 'password123',
    email_confirm: true
  });
  
  if (userError) {
    console.error('Failed to create user:', userError);
    return;
  }
  const userId = user.user.id;
  console.log(`Created user: ${userId}`);

  // 2. Create Shop
  const { data: shop, error: shopError } = await supabaseAdmin
    .from('shops')
    .insert({
      name: 'Cascade Test Shop',
      address: '123 Cascade Way',
      slug: `cascade-shop-${Date.now()}`
    })
    .select()
    .single();

  if (shopError) {
    console.error('Failed to create shop:', shopError);
    return;
  }
  console.log(`Created shop: ${shop.id}`);

  // 3. Create Product
  const { data: product, error: prodError } = await supabaseAdmin
    .from('products')
    .insert({
      name: 'Cascade Test Product',
      category: 'Test',
      price: 50,
      business_id: null // Assuming optional or we skip business link for now if not strictly required by constraints
    })
    .select()
    .single();

  if (prodError) {
    console.error('Failed to create product:', prodError);
    return;
  }
  console.log(`Created product: ${product.id}`);

  // 4. Create Order and Order Item
  // Create Order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      order_code: `ORD-${Date.now()}`,
      customer_id: userId,
      shop_id_origin: shop.id,
      shop_id_fulfill: shop.id,
      total_amount: 50,
      payment_method: 'cash'
    })
    .select()
    .single();

  if (orderError) {
    console.error('Failed to create order:', orderError);
    return;
  }
  console.log(`Created order: ${order.id}`);

  // Create Order Item
  const { data: item, error: itemError } = await supabaseAdmin
    .from('order_items')
    .insert({
      order_id: order.id,
      product_id: product.id,
      quantity: 1,
      unit_price: 50,
      subtotal: 50
    })
    .select()
    .single();

  if (itemError) {
    console.error('Failed to create order item:', itemError);
    return;
  }
  console.log(`Created order item: ${item.id}`);

  // 5. Hard Delete Product
  console.log('Attempting to delete product...');
  const { error: deleteError } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', product.id);

  if (deleteError) {
    console.error('FAIL: Could not delete product:', deleteError);
  } else {
    console.log('PASS: Product deleted successfully.');
  }

  // 6. Verify Order Item is gone
  const { data: checkItem } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('id', item.id)
    .single();

  if (!checkItem) {
    console.log('PASS: Order item was automatically deleted (Cascade worked).');
  } else {
    console.error('FAIL: Order item still exists!');
  }

  // Cleanup
  await supabaseAdmin.auth.admin.deleteUser(userId);
  await supabaseAdmin.from('shops').delete().eq('id', shop.id); // Should cascade orders? maybe
}

runTest();
