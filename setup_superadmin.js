import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jcdaovmwmpkflccecsrg.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is missing in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperAdmin() {
  const email = 'imenabrain@gmail.com';
  const password = 'Aimedollar2$.';
  const name = 'Super Admin';

  console.log(`Setting up Super Admin: ${email}...`);

  // 1. Create or Update User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  let userId;

  if (authError) {
    if (authError.message.includes('already has been registered')) {
      console.log('User already exists. Updating password and fetching ID...');
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Error listing users:', listError);
        return;
      }
      const user = users.find(u => u.email === email);
      if (user) {
        userId = user.id;
        await supabase.auth.admin.updateUserById(userId, { password });
        console.log('Password updated for existing user.');
      }
    } else {
      console.error('Error creating user:', authError);
      return;
    }
  } else {
    userId = authData.user.id;
    console.log('New user created.');
  }

  if (!userId) {
    console.error('Failed to get user ID');
    return;
  }

  console.log('User ID:', userId);

  // 2. Ensure Profile exists
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: name,
      email: email,
      must_change_password: false
    });

  if (profileError) {
    console.error('Error updating profile:', profileError.message);
  } else {
    console.log('Profile updated.');
  }

  // 3. Assign super_admin role
  // Using the app_role enum value 'super_admin'
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: 'super_admin'
    });

  if (roleError) {
    if (roleError.message.includes('duplicate key') || roleError.message.includes('already exists')) {
      console.log('Role super_admin already assigned.');
    } else {
      console.error('Error assigning role:', roleError.message);
    }
  } else {
    console.log('Assigned super_admin role.');
  }

  console.log('\n==========================================');
  console.log('SUCCESS: Super Admin account is ready.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('==========================================');
}

createSuperAdmin();
