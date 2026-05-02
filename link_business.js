import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function linkAdminToBusiness() {
    const email = 'imenabrain@gmail.com';
    const businessSlug = 'delish-bakery-ltd';

    console.log(`Linking ${email} to business ${businessSlug}...`);

    // 1. Get User ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
        perPage: 1000
    });
    if (listError) {
        console.error("Error listing users:", listError.message);
        return;
    }
    
    console.log(`Searching through ${users.length} users...`);
    const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
        console.error(`User ${email} not found.`);
        console.log("First 5 users found:", users.slice(0, 5).map(u => u.email));
        return;
    }
    const userId = user.id;

    // 2. Get Business ID
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('slug', businessSlug)
        .single();

    if (businessError) {
        console.error(`Error finding business ${businessSlug}:`, businessError.message);
        // Let's list all businesses to see what we have
        const { data: allBusinesses } = await supabase.from('businesses').select('id, name, slug');
        console.log("Available businesses:", allBusinesses);
        return;
    }
    const businessId = business.id;

    // 3. Link User to Business in user_businesses table
    const { error: linkError } = await supabase
        .from('user_businesses')
        .upsert({
            user_id: userId,
            business_id: businessId,
            role: 'super_admin' // Upgraded to super_admin
        }, { onConflict: 'user_id,business_id' });

    if (linkError) {
        console.error("Error linking user to business:", linkError.message);
    } else {
        console.log(`Successfully linked ${email} to ${business.name} (${businessSlug}) as super_admin.`);
    }

    // 4. Assign super_admin role for all shops
    const { data: shops } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', businessId);

    if (shops && shops.length > 0) {
        console.log(`Found ${shops.length} shops for this business. Assigning super_admin roles...`);
        for (const shop of shops) {
            const { error: shopRoleError } = await supabase
                .from('user_roles')
                .upsert({
                    user_id: userId,
                    role: 'super_admin', // Upgraded to super_admin
                    shop_id: shop.id,
                    business_id: businessId
                }, { onConflict: 'user_id,role,shop_id' });
            
            if (shopRoleError) {
                console.error(`Error assigning role for shop ${shop.name}:`, shopRoleError.message);
            } else {
                console.log(`Assigned super_admin role for shop: ${shop.name}`);
            }
        }
    }

    // 5. Global user_roles entry (if not already there)
    const { error: globalRoleError } = await supabase
        .from('user_roles')
        .upsert({
            user_id: userId,
            role: 'super_admin',
            business_id: businessId
        }, { onConflict: 'user_id,role,shop_id' });
    
    if (globalRoleError) console.error("Error assigning global super_admin role:", globalRoleError.message);
    else console.log("Global super_admin role assigned for this business.");

    console.log("\nAccess granted successfully.");
}

linkAdminToBusiness();
