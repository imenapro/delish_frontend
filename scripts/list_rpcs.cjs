const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.resolve(__dirname, '../.env');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envConfig[key] = value;
    }
  });
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL || envConfig.SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRPCs() {
  console.log('--- Listing RPC Functions ---');
  const { data, error } = await supabase
    .from('information_schema.routines')
    .select('routine_name, routine_definition')
    .eq('routine_schema', 'public')
    .eq('routine_type', 'FUNCTION');
    
  // Note: Direct query to information_schema might be blocked even for service role depending on setup, 
  // but usually it works if we use the 'postgres' wrapper or if the API exposes it. 
  // Actually, PostgREST doesn't expose information_schema by default.
  // So this might fail.
  
  if (error) {
      console.log('Could not query information_schema:', error.message);
      // Try to just guess common names
      const candidates = ['exec_sql', 'exec', 'query', 'run_sql', 'execute_sql'];
      for (const fn of candidates) {
          const { data, error } = await supabase.rpc(fn, { sql: 'SELECT 1' });
          if (!error || error.message.includes('argument')) {
              console.log(`Potential match found: ${fn}`);
          }
      }
  } else {
      console.table(data);
  }
}

listRPCs();
