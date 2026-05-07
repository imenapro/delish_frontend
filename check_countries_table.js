import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jcdaovmwmpkflccecsrg.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkTable() {
  console.log('Checking for countries table...');
  
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error accessing countries table:', error.message);
    if (error.message.includes('relation "public.countries" does not exist')) {
      console.log('Table "countries" is definitely missing.');
    }
  } else {
    console.log('Table "countries" exists. Current records count:', data.length);
  }
}

checkTable();
