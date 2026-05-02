import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixRLS() {
    console.log("Enabling RLS on 'warehouse_requests'...");
    
    // We need to use SQL to enable RLS. Since we don't have a direct SQL RPC, 
    // we'll try to find a way to execute it. In Supabase, the best way to do this 
    // is usually via the SQL Editor, but I'll try to use a helper script if possible 
    // or just instruct the user. 
    
    // However, I can use the 'postgres' package to connect directly since I have the connection string!
}

// Since I have the DATABASE_URL in .env, I'll use pg to execute the SQL directly.
import pg from 'pg';
const { Client } = pg;

async function executeSQL() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log("Connected to DB for RLS fix.");

        // 0. List all tables to see what we have
        const tablesQuery = `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';`;
        const { rows: allTables } = await client.query(tablesQuery);
        console.log("Tables in public schema:", allTables.map(t => t.tablename).join(', '));

        // 1. Specifically fix warehouse_requests and other critical tables
        const tablesToEnable = ['warehouse_requests', 'factory_stock', 'production_allocation_requests'];
        for (const table of tablesToEnable) {
            console.log(`Enabling RLS on public.${table}...`);
            await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`).catch(e => console.log(`${table} error: ${e.message}`));
        }
        
        // 2. Scan for other tables in the same state (policies exist but RLS disabled)
        const query = `
            SELECT 
                schemaname, 
                tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public' 
            AND rowsecurity = false
            AND tablename IN (SELECT tablename FROM pg_policies WHERE schemaname = 'public');
        `;
        
        const { rows } = await client.query(query);
        
        if (rows.length > 0) {
            console.log(`Found ${rows.length} other tables with policies but RLS disabled.`);
            for (const row of rows) {
                console.log(`Enabling RLS on public.${row.tablename}...`);
                await client.query(`ALTER TABLE public.${row.tablename} ENABLE ROW LEVEL SECURITY;`);
            }
        } else {
            console.log("No other tables found with disabled RLS and existing policies.");
        }

        console.log("RLS fix completed successfully.");
    } catch (err) {
        console.error("Error fixing RLS:", err.message);
    } finally {
        await client.end();
    }
}

executeSQL();
