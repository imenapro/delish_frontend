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

async function cleanupDuplicates() {
  console.log('Fetching all products...');
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, business_id, created_at');

  if (error) {
    console.error('Error fetching products:', error);
    process.exit(1);
  }

  console.log(`Total products found: ${products.length}`);

  const groups = {};
  
  // Group products by name + business_id
  products.forEach(p => {
    const key = `${p.name}|${p.business_id || 'null'}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  });

  const idsToDelete = [];

  Object.keys(groups).forEach(key => {
    const group = groups[key];
    if (group.length > 1) {
      // Sort by created_at ASC (keep oldest/original)
      // If created_at is same, sort by ID to be deterministic
      group.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        if (timeA !== timeB) return timeA - timeB; // Ascending time (Oldest first)
        return a.id.localeCompare(b.id); // Ascending ID
      });

      // Keep the first one (index 0 - oldest), delete the rest (newer duplicates)
      const duplicates = group.slice(1);
      duplicates.forEach(d => idsToDelete.push(d.id));
      
      console.log(`Found duplicate group: ${key}. Keeping ${group[0].id} (Oldest), deleting ${duplicates.length} others.`);
    }
  });

  if (idsToDelete.length === 0) {
    console.log('No duplicates found.');
    return;
  }

  console.log(`Found ${idsToDelete.length} duplicate products to remove.`);

  const tablesWithReferences = [
    'order_items',
    'pos_session_inventory_snapshots',
    'shop_inventory',
    'inventory_transactions',
    'stock_transfers'
  ];

  for (const key of Object.keys(groups)) {
    const group = groups[key];
    if (group.length <= 1) continue;

    // Sort by created_at ASC (keep oldest/original)
    // If created_at is same, sort by ID to be deterministic
    group.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) return timeA - timeB; // Ascending time (Oldest first)
      return a.id.localeCompare(b.id); // Ascending ID
    });

    const winnerId = group[0].id;
    const losers = group.slice(1);

    for (const loser of losers) {
      const loserId = loser.id;
      console.log(`Merging ${loserId} into ${winnerId}...`);

      for (const table of tablesWithReferences) {
        // Try to update references
        const { error: updateError } = await supabase
          .from(table)
          .update({ product_id: winnerId })
          .eq('product_id', loserId);

        if (updateError) {
          // Check for unique constraint violation (code 23505)
          if (updateError.code === '23505') {
            console.log(`  Unique constraint in ${table}, deleting loser references instead...`);
            const { error: deleteRefError } = await supabase
              .from(table)
              .delete()
              .eq('product_id', loserId);
            
            if (deleteRefError) {
              console.error(`  Failed to delete references in ${table}:`, deleteRefError);
            }
          } else {
            // Ignore "relation does not exist" if table missing, else log
            if (updateError.code !== '42P01') {
               console.error(`  Failed to update ${table}:`, updateError);
            }
          }
        }
      }

      // Finally delete the product
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', loserId);

      if (deleteError) {
        console.error(`  Failed to delete product ${loserId}:`, deleteError);
      } else {
        console.log(`  Deleted product ${loserId}`);
      }
    }
  }

  console.log('Cleanup complete.');
}

cleanupDuplicates();
