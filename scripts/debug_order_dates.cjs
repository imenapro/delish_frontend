
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

async function checkOrderDates() {
  console.log('Checking Order Dates...');

  const businessId = 'fd3e0f65-cdd0-4dff-8af8-48c06810867e';
  console.log(`Business ID: ${businessId}`);

  // 1. Get Shops
  const { data: shops, error: shopError } = await supabase
    .from('shops')
    .select('id, name')
    .eq('business_id', businessId);

  if (shopError) {
    console.error('Error fetching shops:', shopError);
    return;
  }

  const shopIds = shops.map(s => s.id);
  console.log(`Found ${shops.length} shops.`);

  if (shopIds.length === 0) {
      console.log('No shops found for this business.');
      return;
  }

  // 2. Fetch Orders Statistics
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('created_at, total_amount, shop_id_origin, status')
    .in('shop_id_origin', shopIds)
    .order('created_at', { ascending: false });

  if (orderError) {
    console.error('Error fetching orders:', orderError);
    return;
  }

  console.log(`Total Orders found: ${orders.length}`);

  if (orders.length > 0) {
      const dates = orders.map(o => new Date(o.created_at));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      console.log(`Earliest Order: ${minDate.toISOString()}`);
      console.log(`Latest Order:   ${maxDate.toISOString()}`);

      // Check current month (Feb 2026)
      const now = new Date('2026-02-06'); // Simulated "Today"
      const startOfMonth = new Date('2026-02-01T00:00:00Z');
      
      const ordersThisMonth = orders.filter(o => new Date(o.created_at) >= startOfMonth);
      console.log(`Orders in Feb 2026: ${ordersThisMonth.length}`);
      
      if (ordersThisMonth.length > 0) {
          console.log('Sample Order from this month:', ordersThisMonth[0]);
      } else {
          console.log('⚠️ NO orders found for this month! This explains the zeros.');
      }
      
      // Breakdown by status
      const statusCounts = {};
      orders.forEach(o => {
          statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });
      console.log('Order Status Breakdown:', statusCounts);
      
      // Frontend filters for: ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']
      const validStatuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
      const validOrders = orders.filter(o => validStatuses.includes(o.status));
      console.log(`Orders with Valid Statuses: ${validOrders.length}`);
      
      const validOrdersThisMonth = validOrders.filter(o => new Date(o.created_at) >= startOfMonth);
      console.log(`Valid Orders in Feb 2026: ${validOrdersThisMonth.length}`);

  } else {
      console.log('No orders found for these shops.');
  }
}

checkOrderDates();
