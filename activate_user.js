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

async function activateUser() {
  const email = 'uwaanto@gmail.com';
  const userId = '63e7fd1a-ee00-40aa-af23-764b012bbc88';
  console.log(`Activating user and assigning super_admin: ${email} (${userId})...`);

  // 1. Activate user in Auth layer (ensure active)
  const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { active: true }
  });

  if (updateAuthError) {
    console.error('Error updating user in Auth:', updateAuthError.message);
  } else {
    console.log('User activated in Auth layer.');
  }

  // 2. Update profile to ensure is_suspended is false
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      is_suspended: false,
      suspended_at: null,
      suspended_by: null
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating profile:', profileError.message);
  } else {
    console.log('Profile marked as active (unsuspended).');
  }

  // 3. Assign super_admin role
  console.log('Cleaning up existing roles...');
  await supabase.from('user_roles').delete().eq('user_id', userId);

  console.log('Assigning super_admin role...');
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: 'super_admin'
    });

  if (roleError) {
    console.error('Error assigning role:', roleError.message);
  } else {
    console.log('Assigned super_admin role in user_roles.');
  }

  console.log('Operation completed.');
}

activateUser();
