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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspectSchema() {
  // Get columns for businesses table
  console.log('--- Businesses Table Columns ---');
  // We can't query information_schema easily via JS client usually unless exposed, 
  // but we can try to fetch one record and see keys, or use a raw query if enabled.
  // Supabase JS client doesn't support raw SQL directly usually unless via RPC.
  // However, we can infer from a select.
  
  const { data: businessData, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .limit(1);
    
  if (businessData && businessData.length > 0) {
    console.log(Object.keys(businessData[0]));
  } else {
    console.log('No businesses found or error:', businessError);
  }

  console.log('\n--- Checking Dependencies ---');
  // This is harder without direct SQL access. 
  // I will assume standard relationships based on codebase naming conventions.
  // But I can check for tables that likely have business_id.
  
  const potentialTables = [
    'shops', 'products', 'orders', 'pos_sessions', 'invoices', 
    'user_role_assignments', 'customers', 'inventory_transactions',
    'stock_transfers', 'taxes', 'payment_methods', 'expenses'
  ];
  
  for (const table of potentialTables) {
    const { data, error } = await supabase.from(table).select('business_id').limit(1);
    if (!error) {
      console.log(`Table '${table}' exists and likely has business_id.`);
    }
  }
}

inspectSchema();
