
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split(/\r?\n/).forEach(line => {
      if (!line.trim() || line.startsWith('#')) return;
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
      }
    });
    return envVars;
  } catch (error) {
    console.error('Error loading .env file:', error);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runStressTest() {
  console.log('Starting Real-Time Stress Test...');

  // 1. Find a business with shops
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('id, business_id, name')
    .limit(5);

  if (shopsError || !shops || shops.length === 0) {
    console.error('Error finding shops or no shops found:', shopsError);
    return;
  }

  console.log(`Found ${shops.length} shops to test with:`, shops.map(s => s.name).join(', '));
  const businessId = shops[0].business_id; // Assume all are relevant or pick one group
  
  // Filter shops for this business to be consistent
  const targetShops = shops.filter(s => s.business_id === businessId);
  console.log(`Targeting ${targetShops.length} shops for Business ID: ${businessId}`);

  // Find a valid user to act as customer/seller
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
    
  if (usersError || !users || users.length === 0) {
      console.error('Error finding a user profile:', usersError);
      return;
  }
  const userId = users[0].id;
  console.log(`Using User ID ${userId} for customer/seller`);

  // 2. Define simulation parameters
  const TOTAL_ORDERS = 20; // Total orders to insert
  const CONCURRENCY = 5;   // Batches of concurrent requests
  
  let ordersCreated = 0;

  console.log(`\nSimulating ${TOTAL_ORDERS} orders with concurrency ${CONCURRENCY}...`);
  console.log('Monitor the Tenant Finance Dashboard for real-time updates!');

  // START LISTENER
  let eventsReceived = 0;
  const channel = supabase
    .channel('stress-test-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => {
        if (payload.new && payload.new.order_code && payload.new.order_code.startsWith('STRESS-')) {
          eventsReceived++;
          // process.stdout.write('.'); // Dot for each event
        }
      }
    )
    .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('Listener SUBSCRIBED to orders table.');
        }
    });

  // Give some time for subscription to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  const startTime = Date.now();

  // 3. Run simulation
  for (let i = 0; i < TOTAL_ORDERS; i += CONCURRENCY) {
    const batchPromises = [];
    const batchSize = Math.min(CONCURRENCY, TOTAL_ORDERS - i);

    for (let j = 0; j < batchSize; j++) {
      const shop = targetShops[Math.floor(Math.random() * targetShops.length)];
      const amount = (Math.random() * 100).toFixed(2);
      
      const orderPayload = {
        // business_id: businessId, // REMOVED: Not in orders table
        shop_id_origin: shop.id,
        shop_id_fulfill: shop.id, // Usually same as origin for POS
        customer_id: userId,
        seller_id: userId,
        order_code: `STRESS-${Date.now()}-${i}-${j}`,
        total_amount: parseFloat(amount),
        status: 'delivered',
        payment_method: 'cash', // must match enum
        created_at: new Date().toISOString(),
        // payment_status: 'paid', // check if this column exists, types.ts didn't show it but migration might have added it. Safest to omit if not required.
        // items: [] // types.ts didn't show items column? It might be in a separate table order_items. 
      };

      batchPromises.push(
        supabase.from('orders').insert(orderPayload).select()
      );
    }

    console.log(`Sending batch of ${batchSize} orders...`);
    const results = await Promise.all(batchPromises);
    
    // Check results
    results.forEach((res, idx) => {
      if (res.error) {
        console.error(`Order ${i + idx + 1} failed:`, res.error.message);
      } else {
        // console.log(`Order ${i + idx + 1} success: ID ${res.data[0].id}`);
        ordersCreated++;
      }
    });

    // Small delay to prevent complete flooding if needed, or to separate batches slightly
    await new Promise(r => setTimeout(r, 500));
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\nCompleted ${ordersCreated} orders in ${duration.toFixed(2)}s`);
  console.log(`Throughput: ${(ordersCreated / duration).toFixed(2)} orders/sec`);

  // Wait for events to arrive
  console.log('Waiting for Realtime events...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log(`\nRealtime Verification:`);
  console.log(`Sent: ${ordersCreated}`);
  console.log(`Received: ${eventsReceived}`);
  
  if (eventsReceived > 0) {
      console.log('✅ Realtime updates are WORKING (Events received).');
  } else {
      console.log('❌ Realtime updates FAILED (No events received). Check replication settings.');
  }

  // Cleanup
  supabase.removeChannel(channel);
}

runStressTest();
