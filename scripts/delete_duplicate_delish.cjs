const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
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

const TARGET_SLUG = 'delish';
const KEEP_SLUG = 'delish-bakery-ltd';

async function deleteDuplicateBusiness() {
  console.log('--- 1. Verifying Businesses ---');

  const { data: targetBusiness, error: tError } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', TARGET_SLUG)
    .single();

  if (tError || !targetBusiness) {
    console.error('Target business (delish) not found or error:', tError);
    return;
  }

  console.log('Target Business to DELETE:', targetBusiness.name, `(${targetBusiness.slug})`, `[${targetBusiness.id}]`);

  const { data: keepBusiness } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', KEEP_SLUG)
    .single();

  if (keepBusiness) {
    console.log('Business to KEEP:', keepBusiness.name, `(${keepBusiness.slug})`, `[${keepBusiness.id}]`);
  }

  if (targetBusiness.id === keepBusiness?.id) {
    console.error('CRITICAL ERROR: Target and Keep business IDs are the same! Aborting.');
    return;
  }

  console.log('\n--- 2. Cleaning up Dependencies ---');

  // Get Shops
  const { data: shops } = await supabase.from('shops').select('id').eq('business_id', targetBusiness.id);
  const shopIds = shops ? shops.map(s => s.id) : [];
  console.log(`Found ${shopIds.length} shops associated with target business.`);

  if (shopIds.length > 0) {
    console.log('Deleting Orders (Origin)...');
    await supabase.from('orders').delete().in('shop_id_origin', shopIds);
    
    console.log('Deleting Orders (Fulfill)...');
    await supabase.from('orders').delete().in('shop_id_fulfill', shopIds);

    console.log('Deleting Inventory Transactions...');
    await supabase.from('inventory_transactions').delete().in('shop_id', shopIds);

    console.log('Deleting Stock Transfers...');
    await supabase.from('stock_transfers').delete().in('from_shop_id', shopIds);
    await supabase.from('stock_transfers').delete().in('to_shop_id', shopIds);

    console.log('Deleting Expenses...');
    await supabase.from('expenses').delete().in('shop_id', shopIds);

    console.log('Deleting Product Requests...');
    await supabase.from('product_requests').delete().in('shop_id', shopIds);

    console.log('Deleting Invoices...');
    await supabase.from('invoices').delete().in('shop_id', shopIds);

    console.log('Deleting Parked Orders...');
    await supabase.from('parked_orders').delete().in('shop_id', shopIds);
    
    // Attempt to detach profiles from these shops if column exists
    console.log('Detaching Profiles from Shops...');
    const { error: profError } = await supabase.from('profiles').update({ shop_id: null }).in('shop_id', shopIds);
    if (profError) console.log('Note: profiles update skipped/failed:', profError.message);
  }

  // Delete POS Sessions
  console.log('Deleting pos_sessions...');
  const { error: psError } = await supabase.from('pos_sessions').delete().eq('business_id', targetBusiness.id);
  if (psError) console.error('Error deleting pos_sessions:', psError.message);

  // Delete Inventory Reasons
  console.log('Deleting inventory_reasons...');
  const { error: irError } = await supabase.from('inventory_reasons').delete().eq('business_id', targetBusiness.id);
  if (irError) console.error('Error deleting inventory_reasons:', irError.message);

  // Delete User Businesses
  console.log('Deleting user_businesses...');
  const { error: ubError } = await supabase.from('user_businesses').delete().eq('business_id', targetBusiness.id);
  if (ubError && ubError.code !== '42P01') console.error('Error deleting user_businesses:', ubError.message);

  // Delete Shops (now safe?)
  console.log('Deleting shops...');
  const { error: shopError } = await supabase.from('shops').delete().eq('business_id', targetBusiness.id);
  if (shopError) console.error('Error deleting shops:', shopError.message);

  // Delete Products
  console.log('Deleting products...');
  const { error: prodError } = await supabase.from('products').delete().eq('business_id', targetBusiness.id);
  if (prodError) console.error('Error deleting products:', prodError.message);

  // Delete User Roles
  console.log('Deleting user_roles...');
  const { error: urError } = await supabase.from('user_roles').delete().eq('business_id', targetBusiness.id);
  if (urError) console.error('Error deleting user_roles:', urError.message);

  // Delete Tenant Email Settings
  console.log('Deleting tenant_email_settings...');
  const { error: tesError } = await supabase.from('tenant_email_settings').delete().eq('business_id', targetBusiness.id);
  if (tesError) console.error('Error deleting tenant_email_settings:', tesError.message);

  // Delete Subscription Statuses
  console.log('Deleting subscription_statuses...');
  const { error: ssError } = await supabase.from('subscription_statuses').delete().eq('business_id', targetBusiness.id);
  if (ssError) console.error('Error deleting subscription_statuses:', ssError.message);

  console.log('\n--- 3. Deleting Business ---');
  const { error: delError } = await supabase
    .from('businesses')
    .delete()
    .eq('id', targetBusiness.id);

  if (delError) {
    console.error('Error deleting business:', delError);
  } else {
    console.log('SUCCESS: Business "Delish" deleted.');
  }
}

deleteDuplicateBusiness();
