import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function seedMenus() {
    console.log("Seeding menus table...");

    // 1. Ensure permissions exist
    const permissions = [
        { code: 'pos.access', description: 'Access Point of Sale', module: 'pos' },
        { code: 'shifts.view', description: 'View and manage shifts', module: 'shifts' },
        { code: 'invoices.view', description: 'View and manage invoices', module: 'invoices' },
        { code: 'shops.view', description: 'View and manage shops', module: 'shops' },
        { code: 'products.view', description: 'View and manage products', module: 'products' },
        { code: 'orders.view', description: 'View orders', module: 'orders' },
        { code: 'kitchen.view', description: 'View kitchen orders', module: 'kitchen' },
        { code: 'inventory.view', description: 'View and manage inventory', module: 'inventory' },
        { code: 'finance.view', description: 'View financial data', module: 'finance' },
        { code: 'workforce.view', description: 'Manage workforce', module: 'workforce' },
        { code: 'reports.view', description: 'View reports', module: 'reports' },
        { code: 'delivery.view', description: 'View delivery tasks', module: 'delivery' },
        { code: 'staff.view', description: 'View and manage staff', module: 'staff' },
        { code: 'admin.view', description: 'Access admin settings', module: 'admin' },
        { code: 'chat.view', description: 'Access chat', module: 'chat' },
        { code: 'wallet.view', description: 'Access wallet', module: 'wallet' },
        { code: 'dashboard.view', description: 'View dashboard', module: 'dashboard' }
    ];

    const { error: permError } = await supabase.from('permissions').upsert(permissions, { onConflict: 'code' });
    if (permError) {
        console.error("Error seeding permissions:", permError.message);
        return;
    }

    // Get all permissions to map IDs
    const { data: allPerms } = await supabase.from('permissions').select('id, code');
    const permMap = Object.fromEntries(allPerms.map(p => [p.code, p.id]));

    // 2. Define Menus
    const menuItems = [
        { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', sort_order: 10, permission_required_id: permMap['dashboard.view'] },
        { label: 'POS', path: '/pos', icon: 'CreditCard', sort_order: 20, permission_required_id: permMap['pos.access'] },
        { label: 'Shifts', path: '/shifts', icon: 'ClipboardList', sort_order: 30, permission_required_id: permMap['shifts.view'] },
        { label: 'Invoices', path: '/invoices', icon: 'Receipt', sort_order: 40, permission_required_id: permMap['invoices.view'] },
        { label: 'Shops', path: '/shops', icon: 'Store', sort_order: 50, permission_required_id: permMap['shops.view'] },
        { label: 'Products', path: '/products', icon: 'Package', sort_order: 60, permission_required_id: permMap['products.view'] },
        { label: 'Orders', path: '/orders', icon: 'ShoppingCart', sort_order: 70, permission_required_id: permMap['orders.view'] },
        { label: 'Kitchen', path: '/kitchen', icon: 'ChefHat', sort_order: 80, permission_required_id: permMap['kitchen.view'] },
        { label: 'Inventory', path: '/inventory', icon: 'PackageOpen', sort_order: 90, permission_required_id: permMap['inventory.view'] },
        { label: 'Finance', path: '/finance', icon: 'DollarSign', sort_order: 100, permission_required_id: permMap['finance.view'] },
        { label: 'Workforce', path: '/workforce', icon: 'Calendar', sort_order: 110, permission_required_id: permMap['workforce.view'] },
        { label: 'Reports', path: '/reports', icon: 'FileText', sort_order: 120, permission_required_id: permMap['reports.view'] },
        { label: 'Delivery', path: '/delivery', icon: 'Truck', sort_order: 130, permission_required_id: permMap['delivery.view'] },
        { label: 'Staff', path: '/staff', icon: 'Users', sort_order: 140, permission_required_id: permMap['staff.view'] },
        { label: 'Admin', path: '/admin', icon: 'Shield', sort_order: 150, permission_required_id: permMap['admin.view'] },
        { label: 'Chat', path: '/chat', icon: 'MessageSquare', sort_order: 160, permission_required_id: permMap['chat.view'] },
        { label: 'Wallet', path: '/wallet', icon: 'Wallet', sort_order: 170, permission_required_id: permMap['wallet.view'] }
    ];

    const { data: existingMenus } = await supabase.from('menus').select('path');
    const existingPaths = new Set(existingMenus?.map(m => m.path) || []);
    
    const newMenus = menuItems.filter(m => !existingPaths.has(m.path));

    if (newMenus.length > 0) {
        const { error: menuError } = await supabase.from('menus').insert(newMenus);
        if (menuError) {
            console.error("Error seeding menus:", menuError.message);
        } else {
            console.log(`Successfully seeded ${newMenus.length} new menus.`);
        }
    } else {
        console.log("All menus already exist.");
    }

    // 3. Re-grant all to super_admin
    const { data: role } = await supabase.from('roles').select('id').eq('name', 'super_admin').single();
    if (role) {
        const rolePerms = allPerms.map(p => ({
            role_id: role.id,
            permission_id: p.id
        }));
        await supabase.from('role_permissions').upsert(rolePerms, { onConflict: 'role_id,permission_id' });
        console.log("Granted all seeded permissions to 'super_admin'.");
    }

    console.log("Done.");
}

seedMenus();
