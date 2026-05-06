import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jcdaovmwmpkflccecsrg.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function findUser() {
  const email = 'uwaanto@gmail.com';
  console.log(`Searching for user: ${email}...`);

  // Search in profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (profileError) {
    console.log('Profile not found:', profileError.message);
    return;
  }
  
  console.log('Profile found:', profile.id);

  // Check roles
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', profile.id);

  if (rolesError) {
    console.error('Error fetching roles:', rolesError.message);
  } else {
    console.log('Current roles:', roles.map(r => r.role));
  }

  // List users in Auth with pagination
  let allAuthUsers = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 100
    });

    if (listError) {
      console.error('Error listing auth users:', listError);
      break;
    }

    allAuthUsers = allAuthUsers.concat(users);
    if (users.length < 100) {
      hasMore = false;
    } else {
      page++;
    }
  }

  console.log(`Found ${allAuthUsers.length} total users in Auth layer.`);
  const match = allAuthUsers.find(u => u.email === email);
  if (match) {
    console.log('Auth user found:', match.id);
    console.log('Auth user status:', match.confirmed_at ? 'Confirmed' : 'Unconfirmed');
  } else {
    console.log('User not found in Auth layer.');
  }
}

findUser();
