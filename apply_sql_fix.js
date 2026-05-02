import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.jcdaovmwmpkflccecsrg:Aimedollar2$.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to DB');

        const sql = `
            -- Drop triggers on tables without id column
            DROP TRIGGER IF EXISTS audit_role_permissions_changes ON public.role_permissions;
            
            -- Fix get_user_menus to allow NULL permissions
            DROP FUNCTION IF EXISTS public.get_user_menus(UUID);
            CREATE OR REPLACE FUNCTION public.get_user_menus(_user_id UUID)
            RETURNS SETOF public.menus AS $$
            BEGIN
              RETURN QUERY
              WITH accessible_menus AS (
                SELECT m.*
                FROM public.menus m
                LEFT JOIN public.permissions p ON m.permission_required_id = p.id
                WHERE m.is_active = true
                AND (
                  m.permission_required_id IS NULL 
                  OR public.has_permission(_user_id, p.code)
                )
              )
              SELECT * FROM accessible_menus
              ORDER BY parent_id NULLS FIRST, sort_order ASC;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;

        await client.query(sql);
        console.log('SQL Fix applied successfully!');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}

run();
