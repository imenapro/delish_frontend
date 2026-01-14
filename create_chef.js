import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hjaiwwoxuympbvjmakpa.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYWl3d294dXltcGJ2am1ha3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAzMDg1NCwiZXhwIjoyMDc3NjA2ODU0fQ.zndd6xzsveSJoYCPvMcOfWmA8WFIyMqV5A0ssxjyHwg";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function createChefUser() {
  const email = 'chef@delish.com';
  const password = 'tempPassword123!';
  const name = 'Chef User';

  console.log(`Creating user ${email}...`);

  // 1. Create User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  let userId;

  if (authError) {
    if (authError.message.includes('already has been registered')) {
      console.log('User already exists. Fetching ID...');
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users.find(u => u.email === email);
      if (user) {
        userId = user.id;
        // Update password just in case
        await supabase.auth.admin.updateUserById(userId, { password });
      }
    } else {
      console.error('Error creating user:', authError);
      return;
    }
  } else {
    userId = authData.user.id;
  }

  if (!userId) {
    console.error('Failed to get user ID');
    return;
  }

  console.log('User ID:', userId);

  // 2. Ensure Profile exists (trigger usually handles it, but let's be safe)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: name,
      must_change_password: false // Don't force change for test user
    });

  if (profileError) {
    console.error('Error updating profile:', profileError);
  }

  // 3. Assign Roles
  // "Chef" is not a role, using "manpower" and "manager"
  const rolesToAssign = ['manpower', 'manager'];
  
  for (const role of rolesToAssign) {
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role
      }, { onConflict: 'user_id, role' }); // Assuming composite key or unique constraint?
      // user_roles has id primary key. upsert needs to know how to match.
      // Usually checking if exists first is safer if no unique constraint on (user_id, role).
      
    if (roleError) {
       // If conflict, ignore
       console.log(`Role ${role} assignment result:`, roleError.message);
    } else {
       console.log(`Assigned role: ${role}`);
    }
  }

  console.log('Done.');
}

createChefUser();
