import { createClient } from '@supabase/supabase-js';

const OLD_URL = "https://hjaiwwoxuympbvjmakpa.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYWl3d294dXltcGJ2am1ha3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAzMDg1NCwiZXhwIjoyMDc3NjA2ODU0fQ.zndd6xzsveSJoYCPvMcOfWmA8WFIyMqV5A0ssxjyHwg";

const NEW_URL = "https://jcdaovmwmpkflccecsrg.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGFvdm13bXBrZmxjY2Vjc3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1OTYxMywiZXhwIjoyMDg1MzM1NjEzfQ._Id8uhTTGh31JA8vXBebb1vgLeE7xuC5KCDQZ9wQMdU";

const oldSupabase = createClient(OLD_URL, OLD_KEY);
const newSupabase = createClient(NEW_URL, NEW_KEY);

const BUSINESS_ID = "fd3e0f65-cdd0-4dff-8af8-48c06810867e"; // Delish Bakery Ltd
const DEFAULT_PASSWORD = "DelishStaff2026!";

async function migrate() {
    console.log("Starting full user migration...");

    try {
        // 1. Fetch all auth users from old (with pagination)
        console.log("Fetching all auth users from old project...");
        let allOldUsers = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            const { data: { users }, error: uError } = await oldSupabase.auth.admin.listUsers({
                page: page,
                perPage: 1000
            });
            if (uError) throw uError;
            
            allOldUsers = allOldUsers.concat(users);
            if (users.length < 1000) {
                hasMore = false;
            } else {
                page++;
            }
        }
        console.log(`Total auth users in old project: ${allOldUsers.length}`);

        const allUserIds = allOldUsers.map(u => u.id);

        // 2. Fetch profiles for all users
        console.log("Fetching profiles from old project...");
        const { data: profiles, error: pError } = await oldSupabase
            .from('profiles')
            .select('*')
            .in('id', allUserIds);
        if (pError) throw pError;
        console.log(`Found ${profiles.length} profiles.`);

        // 3. Fetch user_roles for all users
        console.log("Fetching roles from old project...");
        const { data: userRoles, error: urError } = await oldSupabase
            .from('user_roles')
            .select('*')
            .in('user_id', allUserIds);
        if (urError) throw urError;
        console.log(`Found ${userRoles.length} role assignments.`);

        // 4. Fetch user_businesses for all users
        console.log("Fetching business associations from old project...");
        const { data: userBusinesses, error: ubError } = await oldSupabase
            .from('user_businesses')
            .select('*')
            .in('user_id', allUserIds);
        if (ubError) throw ubError;
        console.log(`Found ${userBusinesses.length} business associations.`);

        for (const user of allOldUsers) {
            console.log(`\n--- Migrating user: ${user.email} ---`);
            
            // a. Create Auth User in new project
            const { data: newUser, error: createUserError } = await newSupabase.auth.admin.createUser({
                id: user.id,
                email: user.email,
                email_confirm: true,
                password: DEFAULT_PASSWORD,
                user_metadata: user.user_metadata,
                app_metadata: user.app_metadata
            });

            if (createUserError) {
                if (createUserError.message.includes("already registered") || createUserError.message.includes("already exists")) {
                    console.log(`User ${user.email} already exists in Auth.`);
                } else if (createUserError.message.includes("Database error creating new user")) {
                    console.log(`Database error for ${user.email}. This might be an ID conflict. Skipping auth creation.`);
                } else {
                    console.error(`Error creating auth user ${user.email}:`, createUserError.message);
                }
            } else {
                console.log(`Auth user ${user.email} created successfully.`);
            }

            // b. Migrate Profile
            const userProfile = profiles.find(p => p.id === user.id);
            if (userProfile) {
                const { must_change_password, ...filteredProfile } = userProfile;
                const { error: profileError } = await newSupabase
                    .from('profiles')
                    .upsert(filteredProfile, { onConflict: 'id' });
                
                if (profileError) {
                    console.error(`Error migrating profile for ${user.email}:`, profileError.message);
                } else {
                    console.log(`Profile for ${user.email} migrated.`);
                }
            }

            // c. Migrate User Business Associations
            const associations = userBusinesses.filter(ub => ub.user_id === user.id);
            for (const assoc of associations) {
                const { joined_at, ...filteredAssoc } = assoc;
                if (!filteredAssoc.role) filteredAssoc.role = 'staff';
                
                const { error: bizError } = await newSupabase
                    .from('user_businesses')
                    .upsert(filteredAssoc, { onConflict: 'id' });
                
                if (bizError) {
                    console.error(`Error migrating business association for ${user.email}:`, bizError.message);
                } else {
                    console.log(`Business association for ${user.email} migrated.`);
                }
            }

            // d. Migrate User Roles
            const roles = userRoles.filter(ur => ur.user_id === user.id);
            for (const role of roles) {
                let normalizedRole = role.role;
                if (normalizedRole === 'Distributor') normalizedRole = 'distributor';
                if (normalizedRole === 'Production') normalizedRole = 'production';
                if (normalizedRole === 'Cashier') normalizedRole = 'seller';
                if (normalizedRole === 'waiter') normalizedRole = 'seller';
                if (normalizedRole === 'Logistics') normalizedRole = 'logistics';
                
                const { error: roleError } = await newSupabase
                    .from('user_roles')
                    .upsert({ ...role, role: normalizedRole }, { onConflict: 'id' });
                
                if (roleError) {
                    console.error(`Error migrating role ${role.role} for ${user.email}:`, roleError.message);
                } else {
                    console.log(`Role ${normalizedRole} for ${user.email} migrated.`);
                }
            }
        }

        const missingUserIds = allUserIds.filter(id => !allOldUsers.find(u => u.id === id));
        if (missingUserIds.length > 0) {
            console.log(`\nFound ${missingUserIds.length} staff members without Auth accounts:`);
            console.log(missingUserIds.join(', '));
            
            // For these users, we can still migrate their profiles and associations
            // but they won't be able to log in until an auth account is created.
            console.log("\nMigrating data for staff without Auth accounts...");
            for (const id of missingUserIds) {
                const profile = profiles.find(p => p.id === id);
                if (profile) {
                    console.log(`Migrating data for: ${profile.name || id}`);
                    const { must_change_password, ...filteredProfile } = profile;
                    await newSupabase.from('profiles').upsert(filteredProfile, { onConflict: 'id' });
                    
                    const userBiz = userBusinesses.find(ub => ub.user_id === id);
                    if (userBiz) {
                        const { joined_at, ...filteredBiz } = userBiz;
                        if (!filteredBiz.role) filteredBiz.role = 'staff';
                        await newSupabase.from('user_businesses').upsert(filteredBiz, { onConflict: 'id' });
                    }

                    const roles = userRoles.filter(ur => ur.user_id === id);
                    for (const role of roles) {
                        let normalizedRole = role.role;
                        if (normalizedRole === 'Distributor') normalizedRole = 'distributor';
                        if (normalizedRole === 'Production') normalizedRole = 'production';
                        if (normalizedRole === 'Cashier') normalizedRole = 'seller';
                        if (normalizedRole === 'waiter') normalizedRole = 'seller';
                        if (normalizedRole === 'Logistics') normalizedRole = 'logistics';
                        await newSupabase.from('user_roles').upsert({ ...role, role: normalizedRole }, { onConflict: 'id' });
                    }
                }
            }
        }

        console.log("\nMigration completed successfully!");
        console.log(`IMPORTANT: All migrated users have been set with the temporary password: ${DEFAULT_PASSWORD}`);

    } catch (err) {
        console.error("Migration failed:", err.message);
    }
}

migrate();
