import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.jcdaovmwmpkflccecsrg:Aimedollar2$.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function cleanup() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to the new database (jcdaovmwmpkflccecsrg)');

        // Check content first
        const checkSql = `SELECT name, type, business_id, count(*) FROM inventory_reasons GROUP BY name, type, business_id HAVING count(*) > 1`;
        const checkRes = await client.query(checkSql);
        console.log('Duplicate counts:', checkRes.rows);

        // SQL to remove duplicates keeping only the first one found for each (name, type, business_id)
        const sql = `
            WITH CTE AS (
                SELECT 
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY name, type, business_id 
                        ORDER BY created_at ASC
                    ) as rn
                FROM inventory_reasons
            )
            DELETE FROM inventory_reasons
            WHERE id IN (
                SELECT id FROM CTE WHERE rn > 1
            );
        `;

        const res = await client.query(sql);
        console.log(`Cleaned up duplicates. Rows affected: ${res.rowCount}`);

    } catch (e) {
        console.error('Error during cleanup:', e);
    } finally {
        await client.end();
    }
}

cleanup();
