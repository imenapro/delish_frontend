import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const OLD_URL = "https://hjaiwwoxuympbvjmakpa.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYWl3d294dXltcGJ2am1ha3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAzMDg1NCwiZXhwIjoyMDc3NjA2ODU0fQ.zndd6xzsveSJoYCPvMcOfWmA8WFIyMqV5A0ssxjyHwg";

const oldSupabase = createClient(OLD_URL, OLD_KEY);

async function inspectSchema() {
    console.log("Inspecting old project schema via REST API...");
    
    // We can't get full SQL via REST, but we can list tables and columns
    // However, the best way to get the *full* schema is via the SQL Editor or db pull.
    // Since we can't do db pull without password, let's try to get what we can via RPC if available, 
    // or just list the tables and their structures.

    const tablesToInspect = [
        'businesses', 'shops', 'profiles', 'categories', 'products', 
        'inventory_transactions', 'shop_inventory', 'user_roles', 
        'orders', 'order_items', 'invoices', 'pos_sessions', 
        'parked_orders', 'expenses', 'stock_transfers'
    ];

    for (const table of tablesToInspect) {
        console.log(`\nTable: ${table}`);
        const { data, error } = await oldSupabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error inspecting ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Columns for ${table}:`, Object.keys(data[0]).join(', '));
        } else {
            console.log(`Table ${table} is empty or inaccessible.`);
        }
    }
}

inspectSchema();
