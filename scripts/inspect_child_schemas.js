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

async function inspectChildSchemas() {
  console.log('--- Shops Columns ---');
  const { data: shops } = await supabase.from('shops').select('*').limit(1);
  if (shops && shops.length > 0) console.log(Object.keys(shops[0]));

  console.log('--- Products Columns ---');
  const { data: products } = await supabase.from('products').select('*').limit(1);
  if (products && products.length > 0) console.log(Object.keys(products[0]));
}

inspectChildSchemas();
