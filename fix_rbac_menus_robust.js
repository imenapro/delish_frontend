import { createClient } from '@supabase/supabase-js';

const NEW_URL = "https://jcdaovmwmpkflccecsrg.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGFvdm13bXBrZmxjY2Vjc3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1OTYxMywiZXhwIjoyMDg1MzM1NjEzfQ._Id8uhTTGh31JA8vXBebb1vgLeE7xuC5KCDQZ9wQMdU";

const supabase = createClient(NEW_URL, NEW_KEY);

async function fixRBAC() {
    console.log("Starting ROBUST RBAC fix...");

    try {
        const { data: roles } = await supabase.from('roles').select('*');
        const { data: perms } = await supabase.from('permissions').select('*');

        const getPermId = (code) => perms.find(p => p.code === code)?.id;
        const getRoleId = (name) => roles.find(r => r.name.toLowerCase() === name.toLowerCase())?.id;

        const dashPerm = getPermId('dashboard.view');
        
        // 1. Give EVERY role the dashboard view
        console.log("Granting dashboard.view to all roles...");
        for (const role of roles) {
            const { error } = await supabase.from('role_permissions').upsert({
                role_id: role.id,
                permission_id: dashPerm
            }, { onConflict: 'role_id,permission_id' });
            if (error) console.error(`Error for ${role.name}:`, error.message);
        }

        // 2. Fix Dashboard Menu
        console.log("Ensuring Dashboard menu is active and has correct permission...");
        await supabase.from('menus').update({ 
            permission_required_id: dashPerm,
            is_active: true 
        }).eq('path', '/dashboard');

        // 3. Define Role -> Permissions mapping
        const mapping = {
            'seller': ['pos.access', 'shifts.view', 'invoices.view', 'orders.view', 'products.view', 'inventory.view'],
            'manager': ['pos.access', 'shifts.view', 'invoices.view', 'orders.view', 'products.view', 'inventory.view', 'staff.view', 'reports.view', 'kitchen.view', 'workforce.view'],
            'branch_manager': ['pos.access', 'shifts.view', 'invoices.view', 'orders.view', 'products.view', 'inventory.view', 'staff.view', 'reports.view', 'kitchen.view', 'workforce.view'],
            'store_owner': ['pos.access', 'shifts.view', 'invoices.view', 'orders.view', 'products.view', 'inventory.view', 'staff.view', 'reports.view', 'kitchen.view', 'workforce.view', 'finance.view', 'admin.view', 'wallet.view'],
            'Owner': ['pos.access', 'shifts.view', 'invoices.view', 'orders.view', 'products.view', 'inventory.view', 'staff.view', 'reports.view', 'kitchen.view', 'workforce.view', 'finance.view', 'admin.view', 'wallet.view'],
            'admin': ['pos.access', 'shifts.view', 'invoices.view', 'orders.view', 'products.view', 'inventory.view', 'staff.view', 'reports.view', 'kitchen.view', 'workforce.view', 'finance.view', 'admin.view', 'wallet.view'],
            'super_admin': perms.map(p => p.code)
        };

        for (const [roleName, permCodes] of Object.entries(mapping)) {
            const roleId = getRoleId(roleName);
            if (!roleId) {
                console.log(`Role ${roleName} not found, skipping.`);
                continue;
            }

            console.log(`Granting permissions to ${roleName}...`);
            for (const code of permCodes) {
                const pId = getPermId(code);
                if (pId) {
                    await supabase.from('role_permissions').upsert({
                        role_id: roleId,
                        permission_id: pId
                    }, { onConflict: 'role_id,permission_id' });
                }
            }
        }

        // 4. Fix other menus that might be hidden
        console.log("Fixing Chat and Wallet menus...");
        const chatPerm = getPermId('chat.view');
        const walletPerm = getPermId('wallet.view');
        if (chatPerm) await supabase.from('menus').update({ permission_required_id: chatPerm }).eq('path', '/chat');
        if (walletPerm) await supabase.from('menus').update({ permission_required_id: walletPerm }).eq('path', '/wallet');

        console.log("\nDone!");

    } catch (err) {
        console.error("Fatal error:", err.message);
    }
}

fixRBAC();
