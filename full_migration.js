import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const OLD_URL = "https://hjaiwwoxuympbvjmakpa.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYWl3d294dXltcGJ2am1ha3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAzMDg1NCwiZXhwIjoyMDc3NjA2ODU0fQ.zndd6xzsveSJoYCPvMcOfWmA8WFIyMqV5A0ssxjyHwg";

const NEW_URL = "https://jcdaovmwmpkflccecsrg.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGFvdm13bXBrZmxjY2Vjc3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1OTYxMywiZXhwIjoyMDg1MzM1NjEzfQ._Id8uhTTGh31JA8vXBebb1vgLeE7xuC5KCDQZ9wQMdU";

const oldSupabase = createClient(OLD_URL, OLD_KEY);
const newSupabase = createClient(NEW_URL, NEW_KEY);

const tables = [
    'businesses',
    'shops',
    'profiles',
    'categories',
    'products',
    'inventory_transactions',
    'shop_inventory',
    'user_roles',
    'orders',
    'order_items',
    'invoices',
    'pos_sessions',
    'parked_orders',
    'expenses',
    'stock_transfers',
    'daily_inventory_snapshots'
];

async function migrate() {
    console.log("Starting data migration...");

    for (const table of tables) {
        console.log(`\nMigrating table: ${table}`);
        
        // 1. Fetch from old
        const { data: oldData, error: fetchError } = await oldSupabase
            .from(table)
            .select('*');

        if (fetchError) {
            console.error(`Error fetching from ${table}:`, fetchError.message);
            continue;
        }

        if (!oldData || oldData.length === 0) {
            console.log(`No data found in ${table}. Skipping.`);
            continue;
        }

        console.log(`Fetched ${oldData.length} rows from ${table}.`);

        // Filter out columns that don't exist in the new schema
        const filteredData = oldData.map(row => {
            const filteredRow = { ...row };
            delete filteredRow.bg_image_url;
            delete filteredRow.invoice_settings;
            delete filteredRow.invoice_template_id;
            delete filteredRow.metadata;
            delete filteredRow.batch_number;
            delete filteredRow.advance_paid;
            delete filteredRow.custom_domain;
            delete filteredRow.grace_period_days;
            delete filteredRow.customer_name;
            delete filteredRow.order_type;
            delete filteredRow.show_login_background;
            delete filteredRow.linked_factory_id;
            delete filteredRow.website;
            delete filteredRow.logo_url;
            delete filteredRow.owner_email;
            delete filteredRow.owner_id;
            delete filteredRow.plan_type;
            delete filteredRow.primary_color;
            delete filteredRow.secondary_color;
            delete filteredRow.slogan;
            delete filteredRow.shop_type;
            delete filteredRow.status;
            delete filteredRow.subscription_end_date;
            delete filteredRow.subscription_start_date;
            delete filteredRow.trial_end_date;
            delete filteredRow.trial_start_date;

            if (table === 'shops') {
                delete filteredRow.owner_id;
                delete filteredRow.slug;
                delete filteredRow.linked_warehouse_id;
                delete filteredRow.locale;
            }
            if (table === 'profiles') {
                delete filteredRow.must_change_password;
                delete filteredRow.email;
            }
            if (table === 'orders') {
                delete filteredRow.remaining_due;
                delete filteredRow.customer_id;
                delete filteredRow.seller_id;
                delete filteredRow.shop_id;
            }
            if (table === 'pos_sessions') {
                delete filteredRow.business_id;
                delete filteredRow.closed_at;
                delete filteredRow.closing_cash;
                delete filteredRow.expected_cash;
                delete filteredRow.notes;
                delete filteredRow.opened_at;
                delete filteredRow.opening_cash;
                delete filteredRow.total_orders;
                delete filteredRow.total_sales;
            }
            if (table === 'parked_orders') {
                delete filteredRow.code;
                delete filteredRow.note;
                delete filteredRow.resumed_at;
                delete filteredRow.resumed_by;
                delete filteredRow.seller_id;
                delete filteredRow.seller_name;
                delete filteredRow.status;
                delete filteredRow.total;
                delete filteredRow.total_amount;
            }
            if (table === 'expenses') {
                delete filteredRow.account_id;
                delete filteredRow.business_id;
                delete filteredRow.deleted_at;
                delete filteredRow.deleted_by;
                delete filteredRow.rejected_reason;
                delete filteredRow.updated_at;
                delete filteredRow.updated_by;
            }
            if (table === 'orders') {
                delete filteredRow.pos_session_id;
                delete filteredRow.customer_id;
                delete filteredRow.seller_id;
                delete filteredRow.shop_id;
            }
            if (table === 'businesses') {
                delete filteredRow.owner_id;
                delete filteredRow.updated_by;
            }
            if (table === 'inventory_transactions') {
                delete filteredRow.created_by;
                delete filteredRow.reason_id;
            }
            if (table === 'stock_transfers') {
                delete filteredRow.requested_by;
                delete filteredRow.approved_by;
            }
            if (table === 'user_roles') {
                if (filteredRow.role === 'Distributor') filteredRow.role = 'distributor';
                if (filteredRow.role === 'Production') filteredRow.role = 'manpower';
                if (filteredRow.role === 'Cashier') filteredRow.role = 'seller';
                if (filteredRow.role === 'waiter') filteredRow.role = 'seller';
                if (filteredRow.role === 'production') filteredRow.role = 'manpower';
                if (filteredRow.role === 'kitchen') filteredRow.role = 'manpower';
                if (filteredRow.role === 'Logistics') filteredRow.role = 'Logistics';
            }
            if (table === 'invoices') {
                delete filteredRow.created_by;
                delete filteredRow.staff_id;
                delete filteredRow.order_id;
            }
            if (table === 'shops') {
                delete filteredRow.owner_id;
                delete filteredRow.slug;
            }
            return filteredRow;
        });

        // 2. Insert into new (batching)
        const batchSize = 100;
        for (let i = 0; i < filteredData.length; i += batchSize) {
            const batch = filteredData.slice(i, i + batchSize);
            const { error: insertError } = await newSupabase
                .from(table)
                .upsert(batch, { onConflict: 'id' });

            if (insertError) {
                console.error(`Error inserting batch into ${table}:`, insertError.message);
            } else {
                console.log(`Inserted batch ${Math.floor(i/batchSize) + 1} for ${table}.`);
            }
        }
    }

    // Special handling for Auth Users (can only be done via admin API)
    console.log("\nChecking for Auth Users...");
    const { data: { users: oldUsers }, error: usersError } = await oldSupabase.auth.admin.listUsers();
    
    if (usersError) {
        console.error("Error fetching auth users:", usersError.message);
    } else if (oldUsers && oldUsers.length > 0) {
        console.log(`Found ${oldUsers.length} users in old project.`);
        for (const user of oldUsers) {
            console.log(`Migrating user: ${user.email}`);
            const { error: createUserError } = await newSupabase.auth.admin.createUser({
                id: user.id,
                email: user.email,
                email_confirm: true,
                user_metadata: user.user_metadata,
                app_metadata: user.app_metadata
            });

            if (createUserError) {
                if (createUserError.message.includes("already registered")) {
                    console.log(`User ${user.email} already exists in new project.`);
                } else {
                    console.error(`Error creating user ${user.email}:`, createUserError.message);
                }
            } else {
                console.log(`User ${user.email} created successfully.`);
            }
        }
    }

    console.log("\nMigration completed!");
}

migrate();
