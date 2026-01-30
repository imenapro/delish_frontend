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
  console.log('Starting Soft Delete Verification...');
  console.log('Service Role Key starts with:', SUPABASE_SERVICE_ROLE_KEY.substring(0, 10));

  // Test Admin Access
  const { error: adminTestError } = await supabaseAdmin.from('shops').select('id').limit(1);
  if (adminTestError) {
    console.error('CRITICAL: Admin client cannot read shops. Key might be wrong or RLS is blocking service_role (unlikely).', adminTestError);
  } else {
    console.log('Admin client access verified.');
  }

  // 1. Create a test user to simulate auth context
  const testEmail = `test_sd_${Date.now()}@example.com`;
  const testPassword = 'password123';
  
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });

  if (userError) {
    console.error('Failed to create test user:', userError);
    return;
  }
  
  const userId = userData.user.id;
  console.log(`Created test user: ${userId}`);

  // Hardcoded key from client.ts since .env might fail or not have it
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYWl3d294dXltcGJ2am1ha3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMzA4NTQsImV4cCI6MjA3NzYwNjg1NH0.L9qT60c7NpXqDL_LrRUxog20ISOlWizQVvV5L4zCrxo";

  // 2. Sign in as this user to get a client with auth context
  // Use a separate client for auth to avoid polluting supabaseAdmin state
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionData, error: signInError } = await authClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInError) {
    console.error('Failed to sign in:', signInError);
    return;
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    }
  });

  // 3. Create Business
  const businessName = `Test Business ${Date.now()}`;
  console.log(`Creating business: ${businessName}`);
  
  const { data: business, error: busError } = await userClient
    .from('businesses')
    .insert({ 
      name: businessName, 
      business_type: 'bakery',
      slug: `test-biz-${Date.now()}`,
      owner_id: userId
    })
    .select()
    .single();

  if (busError) {
    // If simple insert fails (maybe missing fields), try to inspect schema or just ignore strictness
    console.error('Failed to create business:', busError);
    // Try with minimal fields? existing schema showed name, slug... slug might be auto-generated or required?
    // Let's try to add slug if needed.
    return;
  }
  
  console.log(`Business created: ${business.id}`);
  
  // Verify Audit Fields (Insert)
  if (business.created_by !== userId) console.error('FAIL: created_by not set correctly');
  else console.log('PASS: created_by set correctly');
  
  if (!business.created_date) console.error('FAIL: created_date not set');
  else console.log('PASS: created_date set');

  // 4. Create Shop (Use Admin to bypass RLS for setup)
  console.log('Creating Shop...');
  const { data: shop, error: shopError } = await supabaseAdmin
    .from('shops')
    .insert({ 
      name: 'Test Shop', 
      address: '123 Test St',
      business_id: business.id,
      slug: `test-shop-${Date.now()}`
    })
    .select()
    .single();
    
  if (shopError) console.error('Failed to create shop:', shopError);
  else console.log(`Shop created: ${shop.id}`);

  // 5. Create Product (Use Admin to bypass RLS for setup)
  console.log('Creating Product...');
  const { data: product, error: prodError } = await supabaseAdmin
    .from('products')
    .insert({ 
      name: 'Test Product', 
      category: 'test-category',
      business_id: business.id, 
      price: 100 
    })
    .select()
    .single();

  if (prodError) console.error('Failed to create product:', prodError);
  else console.log(`Product created: ${product.id}`);

  // 6. Perform Soft Delete
  console.log('Executing Soft Delete...');
  const { error: rpcError } = await userClient.rpc('soft_delete_business', {
    target_business_id: business.id
  });

  if (rpcError) {
    console.error('RPC Failed:', rpcError);
    return;
  }
  console.log('RPC executed successfully.');

  // 7. Verify Results
  // Fetch Business
  const { data: updatedBusiness } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .eq('id', business.id)
    .single();

  if (updatedBusiness.deleted_status === true) console.log('PASS: Business deleted_status is TRUE');
  else console.error('FAIL: Business deleted_status is', updatedBusiness.deleted_status);

  if (updatedBusiness.deleted_by === userId) console.log('PASS: Business deleted_by is correct');
  else console.error('FAIL: Business deleted_by is', updatedBusiness.deleted_by);

  if (updatedBusiness.deleted_date) console.log('PASS: Business deleted_date is set');
  else console.error('FAIL: Business deleted_date is missing');

  // Fetch Shop
  if (shop) {
    const { data: updatedShop } = await supabaseAdmin
      .from('shops')
      .select('is_active')
      .eq('id', shop.id)
      .single();
      
    if (updatedShop.is_active === false) console.log('PASS: Shop is_active is FALSE');
    else console.error('FAIL: Shop is_active is', updatedShop.is_active);
  }

  // Fetch Product
  if (product) {
    const { data: updatedProduct } = await supabaseAdmin
      .from('products')
      .select('is_active')
      .eq('id', product.id)
      .single();
      
    if (updatedProduct.is_active === false) console.log('PASS: Product is_active is FALSE');
    else console.error('FAIL: Product is_active is', updatedProduct.is_active);
  }

  // Cleanup Test User
  await supabaseAdmin.auth.admin.deleteUser(userId);
  console.log('Cleanup: Test user deleted.');
}

runTest();
