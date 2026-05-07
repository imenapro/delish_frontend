import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

const sql = `
-- Create countries table
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Everyone can view active countries" ON public.countries;
CREATE POLICY "Everyone can view active countries" ON public.countries FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Super Admins can manage countries" ON public.countries;
CREATE POLICY "Super Admins can manage countries" ON public.countries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.countries;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.countries
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
`;

async function createTable() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Running SQL to create countries table...');
    await client.query(sql);
    console.log('SQL executed successfully.');
  } catch (err) {
    console.error('Error executing SQL:', err.message);
  } finally {
    await client.end();
  }
}

createTable();
