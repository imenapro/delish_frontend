import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jcdaovmwmpkflccecsrg.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function restoreUser() {
  const email = 'uwaanto@gmail.com';
  const name = 'UWANYIRIGIRA Antoinette';
  const tempPassword = 'TempPassword123!';

  console.log(`Restoring user: ${email}...`);

  // 1. Create user in Auth layer
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name }
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    return;
  }

  const newUserId = authData.user.id;
  console.log('New Auth User ID:', newUserId);

  // 2. Update existing profile (if any) or create new one
  // We'll update the old profile ID to the new one to preserve history
  const oldProfileId = '63e7fd1a-ee00-40aa-af23-764b012bbc88';
  
  console.log(`Updating profile from ${oldProfileId} to ${newUserId}...`);
  
  // First, check if we can just update the ID (Postgres might have constraints)
  // Since we can't easily update PKs if they are FKed elsewhere without cascading,
  // we'll upsert the new profile and then maybe delete the old one?
  // Or better, update the user_roles and then the profile.
  
  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({
      id: newUserId,
      email: email,
      name: name,
      must_change_password: true,
      is_suspended: false
    });

  if (upsertError) {
    console.error('Error upserting profile:', upsertError.message);
  } else {
    console.log('Profile created/updated for new ID.');
  }

  // 3. Assign super_admin role
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      user_id: newUserId,
      role: 'super_admin'
    });

  if (roleError) {
    console.error('Error assigning role:', roleError.message);
  } else {
    console.log('Assigned super_admin role.');
  }

  console.log('User restored successfully. Temp Password:', tempPassword);
}

restoreUser();
