
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const { startOfDay, startOfWeek, startOfMonth, format } = require('date-fns');

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

async function verifyFinance() {
  console.log('Verifying Finance Data...');
  
  // 1. Get all shops
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('id, name, business_id');

  if (shopsError) {
    console.error('Error fetching shops:', shopsError);
    return;
  }

  console.log(`Found ${shops.length} shops.`);

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  console.log('Time Reference:', {
    now: now.toISOString(),
    todayStart: todayStart.toISOString(),
    weekStart: weekStart.toISOString(),
    monthStart: monthStart.toISOString()
  });

  for (const shop of shops) {
    console.log(`\nAnalyzing Shop: ${shop.name} (${shop.id})`);

    // 2. Fetch valid orders for this shop
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount, created_at, status')
      .eq('shop_id_origin', shop.id)
      .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']);

    if (ordersError) {
      console.error(`Error fetching orders for shop ${shop.name}:`, ordersError);
      continue;
    }

    // 3. Calculate Stats
    let daily = 0;
    let weekly = 0;
    let monthly = 0;
    let total = 0;

    orders.forEach(o => {
      const orderDate = new Date(o.created_at);
      const amount = Number(o.total_amount);
      total += amount;

      if (orderDate >= todayStart) daily += amount;
      if (orderDate >= weekStart) weekly += amount;
      if (orderDate >= monthStart) monthly += amount;
    });

    console.log(`  - Total Orders: ${orders.length}`);
    console.log(`  - Daily Sales: ${daily.toFixed(2)}`);
    console.log(`  - Weekly Sales: ${weekly.toFixed(2)}`);
    console.log(`  - Monthly Sales: ${monthly.toFixed(2)}`);
    console.log(`  - Total All Time: ${total.toFixed(2)}`);
  }
}

verifyFinance();
