import { createClient } from '@supabase/supabase-js';

const NEW_URL = "https://jcdaovmwmpkflccecsrg.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGFvdm13bXBrZmxjY2Vjc3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1OTYxMywiZXhwIjoyMDg1MzM1NjEzfQ._Id8uhTTGh31JA8vXBebb1vgLeE7xuC5KCDQZ9wQMdU";

const supabase = createClient(NEW_URL, NEW_KEY);

async function fixRBAC() {
    console.log("Starting RBAC and Menu fix...");

    try {
        // 1. Get all roles and permissions
        const { data: roles } = await supabase.from('roles').select('id, name');
        const { data: perms } = await supabase.from('permissions').select('id, code');
        
        const getPermId = (code) => perms.find(p => p.code === code)?.id;

        const dashboardPermId = getPermId('dashboard.view');
        const ordersPermId = getPermId('orders.view');
        const chatPermId = getPermId('chat.view');
        const walletPermId = getPermId('wallet.view');
        const productsPermId = getPermId('products.view');
        const inventoryPermId = getPermId('inventory.view');
        const reportsPermId = getPermId('reports.view');
        const staffPermId = getPermId('staff.view');
        const adminPermId = getPermId('admin.view');

        if (!dashboardPermId) {
            console.error("Critical: dashboard.view permission missing!");
            return;
        }

        // 2. Fix Dashboard Menu
        console.log("Updating Dashboard menu permission...");
        await supabase.from('menus').update({ permission_required_id: dashboardPermId }).eq('path', '/dashboard');

        // 3. Grant dashboard.view to ALL roles
        console.log("Granting dashboard.view to all roles...");
        const rolePerms = roles.map(role => ({
            role_id: role.id,
            permission_id: dashboardPermId
        }));
        await supabase.from('role_permissions').upsert(rolePerms, { onConflict: 'role_id,permission_id' });

        // 4. Specifically fix store_owner and manager (they should see almost everything)
        const powerRoles = roles.filter(r => ['store_owner', 'manager', 'admin', 'branch_manager', 'Owner'].includes(r.name));
        console.log(`Granting wide access to ${powerRoles.length} power roles...`);
        
        const powerPerms = [
            dashboardPermId, ordersPermId, chatPermId, walletPermId, 
            productsPermId, inventoryPermId, reportsPermId, staffPermId, adminPermId
        ].filter(id => !!id);

        for (const role of powerRoles) {
            const inserts = powerPerms.map(pId => ({
                role_id: role.id,
                permission_id: pId
            }));
            await supabase.from('role_permissions').upsert(inserts, { onConflict: 'role_id,permission_id' });
        }

        // 5. Ensure seller has basic menus
        const sellerRole = roles.find(r => r.name === 'seller');
        if (sellerRole) {
            console.log("Ensuring seller has basic menus...");
            const sellerPerms = [dashboardPermId, getPermId('pos.access'), ordersPermId, getPermId('shifts.view'), getPermId('invoices.view')].filter(id => !!id);
            const sellerInserts = sellerPerms.map(pId => ({
                role_id: sellerRole.id,
                permission_id: pId
            }));
            await supabase.from('role_permissions').upsert(sellerInserts, { onConflict: 'role_id,permission_id' });
        }

        console.log("\nRBAC fix completed successfully!");

    } catch (err) {
        console.error("Fix failed:", err.message);
    }
}

fixRBAC();
