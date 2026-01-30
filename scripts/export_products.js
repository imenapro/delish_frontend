import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read env file from current directory
const envPath = path.resolve(process.cwd(), '.env');
let SUPABASE_URL = '';
let SUPABASE_SERVICE_ROLE_KEY = '';

console.log(`Reading .env from ${envPath}`);

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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function exportProducts() {
  console.log('Fetching products...');
  // Fetch all products without RLS because we are using the service role key
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('Error fetching products:', error);
    process.exit(1);
  }

  console.log(`Found ${products.length} products.`);

  const outputPath = path.resolve(process.cwd(), 'products_export.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
  console.log(`Products exported to ${outputPath}`);
}

exportProducts();
