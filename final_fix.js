import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkAndFix() {
    console.log("Checking for 'categories' table...");
    const { error: catError } = await supabase.from('categories').select('*').limit(1);
    
    if (catError && catError.message.includes("does not exist")) {
        console.log("'categories' table is missing.");
    } else {
        console.log("'categories' table exists.");
    }

    console.log("\nSetting up Super Admin: imenabrain@gmail.com");
    const email = 'imenabrain@gmail.com';
    const password = 'Aimedollar2$.';

    let userId;
    
    // Better way to find a user: list all and filter, but handle pagination
    let allUsers = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 1000
        });
        
        if (listError) {
            console.error("Error listing users:", listError.message);
            return;
        }
        
        allUsers = allUsers.concat(users);
        if (users.length < 1000) hasMore = false;
        else page++;
    }
    
    const existingUser = allUsers.find(u => u.email === email);
    
    if (existingUser) {
        userId = existingUser.id;
        await supabase.auth.admin.updateUserById(userId, { password });
        console.log("User exists, password updated.");
    } else {
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: 'Imenabrain Admin' }
        });
        if (userError) {
            console.error("Error creating user:", userError.message);
            return;
        }
        userId = userData.user.id;
        console.log("User created successfully.");
    }

    if (!userId) {
        console.error("Could not determine user ID.");
        return;
    }

    // 2. Profile
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        name: 'Imenabrain Admin',
        email: email
    });
    if (profileError) console.error("Profile error:", profileError.message);
    else console.log("Profile updated.");

    // 3. Super Admin Role
    const { data: existingRoles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'super_admin');

    if (existingRoles && existingRoles.length > 0) {
        console.log("Super Admin role already assigned.");
    } else {
        const { error: roleError } = await supabase.from('user_roles').insert({
            user_id: userId,
            role: 'super_admin'
        });
        
        if (roleError) console.error("Role error:", roleError.message);
        else console.log("Super Admin role assigned.");
    }

    console.log("\n==========================================");
    console.log("Super Admin 'imenabrain@gmail.com' is ready.");
    console.log("==========================================");
}

checkAndFix();
