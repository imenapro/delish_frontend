import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixRBAC() {
    console.log("Checking RBAC system data...");

    // 1. Ensure 'super_admin' role exists in 'roles' table
    const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'super_admin')
        .single();

    let superAdminRoleId;
    if (roleError) {
        console.log("'super_admin' role missing in 'roles' table. Creating it...");
        const { data: newRole, error: createError } = await supabase
            .from('roles')
            .insert({ name: 'super_admin', description: 'System Super Administrator', is_system: true })
            .select()
            .single();
        if (createError) {
            console.error("Error creating super_admin role:", createError.message);
            return;
        }
        superAdminRoleId = newRole.id;
    } else {
        superAdminRoleId = role.id;
        console.log("'super_admin' role exists with ID:", superAdminRoleId);
    }

    // 2. Ensure all permissions are granted to super_admin
    console.log("Granting all permissions to 'super_admin'...");
    const { data: allPermissions } = await supabase.from('permissions').select('id');
    if (allPermissions && allPermissions.length > 0) {
        const rolePermissions = allPermissions.map(p => ({
            role_id: superAdminRoleId,
            permission_id: p.id
        }));

        const { error: grantError } = await supabase
            .from('role_permissions')
            .upsert(rolePermissions, { onConflict: 'role_id,permission_id' });

        if (grantError) console.error("Error granting permissions:", grantError.message);
        else console.log(`Granted ${allPermissions.length} permissions to 'super_admin'.`);
    } else {
        console.log("No permissions found to grant. This might be the issue!");
        // Let's seed some basic permissions if none exist
        const basicPerms = [
            { code: 'roles.view', module: 'system' },
            { code: 'roles.manage', module: 'system' },
            { code: 'permissions.view', module: 'system' },
            { code: 'permissions.manage', module: 'system' },
            { code: 'users.view', module: 'users' },
            { code: 'users.manage', module: 'users' },
            { code: 'menus.view', module: 'system' },
            { code: 'menus.manage', module: 'system' },
            { code: 'dashboard.view', module: 'dashboard' },
            { code: 'pos.access', module: 'pos' },
            { code: 'orders.view', module: 'orders' },
            { code: 'inventory.view', module: 'inventory' },
            { code: 'finance.view', module: 'finance' }
        ];
        const { error: seedError } = await supabase.from('permissions').insert(basicPerms);
        if (seedError) console.error("Error seeding permissions:", seedError.message);
        else {
            console.log("Seeded basic permissions. Retrying grant...");
            return fixRBAC(); // Recursive call to retry
        }
    }

    // 3. Ensure 'menus' table is not empty
    const { data: menus, error: menuError } = await supabase.from('menus').select('id').limit(1);
    if (!menus || menus.length === 0) {
        console.log("'menus' table is empty. This is why nothing shows!");
        // We should probably re-run the migrations or seed the menus.
        // I'll try to find a seed file for menus.
    } else {
        console.log("'menus' table has data.");
    }

    // 4. Verify Imenabrain has the role
    const email = 'imenabrain@gmail.com';
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
        const { data: userRoles } = await supabase.from('user_roles').select('*').eq('user_id', user.id);
        console.log(`User roles for ${email}:`, userRoles.map(r => r.role));
    }

    console.log("Fix completed.");
}

fixRBAC();
