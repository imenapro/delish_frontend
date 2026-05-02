import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.jcdaovmwmpkflccecsrg:Aimedollar2$.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to DB');

        const sql = `
            SELECT 
                column_name, 
                data_type
            FROM information_schema.columns
            WHERE table_name = 'user_roles' AND column_name = 'role';
        `;

        const { rows } = await client.query(sql);
        console.log('Role Column Type:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}

run();
