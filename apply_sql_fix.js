import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.jcdaovmwmpkflccecsrg:Aimedollar2$.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to DB');

        const sql = `
            CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS TRIGGER AS $$
            DECLARE
              v_shop_id uuid;
            BEGIN
              -- Handle shop_id safely
              BEGIN
                v_shop_id := NULLIF(NEW.raw_user_meta_data->>'shop_id', '')::uuid;
              EXCEPTION WHEN OTHERS THEN
                v_shop_id := NULL;
              END;

              -- Insert into profiles (Robustly)
              BEGIN
                INSERT INTO public.profiles (id, name, email, phone, shop_id)
                VALUES (
                  NEW.id,
                  COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
                  NEW.email,
                  NEW.raw_user_meta_data->>'phone',
                  v_shop_id
                );
              EXCEPTION WHEN OTHERS THEN
                -- If it fails, try to update if it exists, or just log warning
                UPDATE public.profiles 
                SET name = COALESCE(NEW.raw_user_meta_data->>'name', name),
                    email = COALESCE(NEW.email, email),
                    phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
                    shop_id = COALESCE(v_shop_id, shop_id)
                WHERE id = NEW.id;
              END;

              -- Create wallet
              BEGIN
                INSERT INTO public.wallets (user_id, balance, currency)
                VALUES (NEW.id, 0.00, 'RWF')
                ON CONFLICT (user_id) DO NOTHING;
              EXCEPTION WHEN OTHERS THEN
                NULL;
              END;

              -- Assign role
              BEGIN
                INSERT INTO public.user_roles (user_id, role, business_id, shop_id)
                VALUES (
                  NEW.id,
                  COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'customer')::public.app_role,        
                  NULLIF(NEW.raw_user_meta_data->>'business_id', '')::uuid,
                  v_shop_id
                )
                ON CONFLICT DO NOTHING;
              EXCEPTION WHEN OTHERS THEN
                NULL;
              END;

              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;

        await client.query(sql);
        console.log('handle_new_user function updated to be more robust.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}

run();
