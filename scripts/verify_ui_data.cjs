
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
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyUIData() {
  console.log('Starting Finance Module Verification...');
  console.log('---------------------------------------');

  // 1. Fetch Shops
  const { data: shops, error: shopError } = await supabase.from('shops').select('id, name');
  if (shopError) {
    console.error('Error fetching shops:', shopError);
    return;
  }
  
  const shopIds = shops.map(s => s.id);
  console.log(`Found ${shops.length} shops.`);

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  // Earliest date needed is monthStart (since we want daily/weekly/monthly)
  // Actually weekly might start before monthStart if month started mid-week?
  // No, startOfMonth is 1st. startOfWeek is Monday.
  // We should take the min.
  const earliestDate = new Date(Math.min(weekStart.getTime(), monthStart.getTime()));

  console.log(`\nTime Reference (Server/Script Local):`);
  console.log(`Today Start: ${todayStart.toISOString()}`);
  console.log(`Week Start:  ${weekStart.toISOString()}`);
  console.log(`Month Start: ${monthStart.toISOString()}`);
  console.log(`Querying orders since: ${earliestDate.toISOString()}`);

  // 2. Fetch Orders for Pulse (Confirmed/Ready/Delivered/etc)
  // Matching UI Logic: .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'])
  let allOrders = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  console.log('Fetching orders recursively...');

  while (hasMore) {
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('total_amount, created_at, shop_id_origin, status')
      .in('shop_id_origin', shopIds)
      .gte('created_at', earliestDate.toISOString())
      .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'])
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (orderError) {
      console.error('Error fetching orders:', orderError);
      return;
    }

    if (orders.length > 0) {
      allOrders = [...allOrders, ...orders];
      if (orders.length < pageSize) hasMore = false;
      page++;
    } else {
      hasMore = false;
    }
  }

  const orders = allOrders;
  console.log(`Fetched ${orders.length} orders matching criteria.`);

  const global = {
    daily: 0,
    weekly: 0,
    monthly: 0
  };

  const shopStats = {};

  shops.forEach(s => {
    shopStats[s.id] = { name: s.name, daily: 0, weekly: 0, monthly: 0, count: 0 };
  });

  orders.forEach(o => {
    const d = new Date(o.created_at);
    const amount = Number(o.total_amount);

    if (d >= todayStart) {
      global.daily += amount;
      if (shopStats[o.shop_id_origin]) shopStats[o.shop_id_origin].daily += amount;
    }
    if (d >= weekStart) {
      global.weekly += amount;
      if (shopStats[o.shop_id_origin]) shopStats[o.shop_id_origin].weekly += amount;
    }
    if (d >= monthStart) {
      global.monthly += amount;
      if (shopStats[o.shop_id_origin]) shopStats[o.shop_id_origin].monthly += amount;
    }
    
    if (shopStats[o.shop_id_origin]) shopStats[o.shop_id_origin].count++;
  });

  console.log('\n--- Global Sales Pulse (Expected UI Values) ---');
  console.log(`Daily Sales:   ${global.daily.toLocaleString()} (Orders today)`);
  console.log(`Weekly Sales:  ${global.weekly.toLocaleString()}`);
  console.log(`Monthly Sales: ${global.monthly.toLocaleString()}`);

  console.log('\n--- Shop Performance Breakdown ---');
  Object.values(shopStats).forEach(s => {
    console.log(`[${s.name}]`);
    console.log(`  Daily:   ${s.daily.toLocaleString()}`);
    console.log(`  Weekly:  ${s.weekly.toLocaleString()}`);
    console.log(`  Monthly: ${s.monthly.toLocaleString()}`);
    console.log(`  Total Valid Orders: ${s.count}`);
  });

  // 3. Verify Expenses
  const { data: expenses, error: expenseError } = await supabase
    .from('expenses')
    .select('amount, expense_date')
    .in('shop_id', shopIds)
    .gte('expense_date', monthStart.toISOString().split('T')[0]); // This month

  if (expenseError) {
    console.error('Error fetching expenses:', expenseError);
  } else {
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    console.log('\n--- Expenses (This Month) ---');
    console.log(`Total: ${totalExpenses.toLocaleString()}`);
    console.log(`Count: ${expenses.length}`);
  }

  console.log('\nVerification Complete.');
}

verifyUIData();
