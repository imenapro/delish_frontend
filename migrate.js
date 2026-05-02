import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Using the verified IP for Frankfurt pooler (aws-1-eu-central-1)
const config = {
  connectionString: process.env.DATABASE_URL,
};

async function migrate() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log("Connected to database");

    // Apply FIX_MISSING_TABLES first
    const fixPath = path.join(process.cwd(), 'FIX_MISSING_TABLES.sql');
    if (fs.existsSync(fixPath)) {
      console.log("Applying FIX_MISSING_TABLES.sql");
      const sql = fs.readFileSync(fixPath, 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error applying FIX_MISSING_TABLES.sql:", err.message);
      }
    }

    // Apply UPGRADE_SCHEMA
    const upgradePath = path.join(process.cwd(), 'UPGRADE_SCHEMA.sql');
    if (fs.existsSync(upgradePath)) {
      console.log("Applying UPGRADE_SCHEMA.sql");
      const sql = fs.readFileSync(upgradePath, 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error applying UPGRADE_SCHEMA.sql:", err.message);
      }
    }

    // Apply FIX_WAREHOUSE_RLS
    const warehousePath = path.join(process.cwd(), 'FIX_WAREHOUSE_RLS.sql');
    if (fs.existsSync(warehousePath)) {
      console.log("Applying FIX_WAREHOUSE_RLS.sql");
      const sql = fs.readFileSync(warehousePath, 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error applying FIX_WAREHOUSE_RLS.sql:", err.message);
      }
    }

    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${files.length} migration files`);

    for (const file of files) {
      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error applying migration ${file}:`, err.message);
        // If it's a "relation already exists" or similar, we might want to continue, 
        // but for a fresh DB, any error is significant.
        // For now, let's keep going but log clearly.
      }
    }

    // Apply additional seed files
    const seedFiles = [
      'FIX_MISSING_TABLES.sql',
      'SEED_GRANULAR_PERMISSIONS.sql',
      'SUPERADMIN_SETUP.sql',
      'FIX_AUTH_PERMISSIONS.sql'
    ];

    for (const file of seedFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        console.log(`Applying seed file: ${file}`);
        let sql = fs.readFileSync(filePath, 'utf8');
        
        if (file === 'SUPERADMIN_SETUP.sql') {
            sql = sql.replace("'your-email@example.com'", "'admin@delish.com'");
        }

        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`Error applying seed file ${file}:`, err.message);
        }
      }
    }

    // Import products
    const productsPath = path.join(process.cwd(), 'products_export.json');
    if (fs.existsSync(productsPath)) {
      console.log("Importing products from products_export.json");
      const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
      
      for (const product of products) {
        let { id, name, description, category, price, image_url, is_active, barcode, business_id, discount_price, promotion_description } = product;
        
        // Ensure business_id is set if required
        if (!business_id) {
          business_id = 'fd3e0f65-cdd0-4dff-8af8-48c06810867e';
        }

        const insertSql = `
          INSERT INTO public.products (id, name, description, category, price, image_url, is_active, barcode, business_id, discount_price, promotion_description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            price = EXCLUDED.price,
            image_url = EXCLUDED.image_url,
            is_active = EXCLUDED.is_active,
            barcode = EXCLUDED.barcode,
            business_id = EXCLUDED.business_id,
            discount_price = EXCLUDED.discount_price,
            promotion_description = EXCLUDED.promotion_description;
        `;
        
        try {
          await client.query(insertSql, [id, name, description, category, price, image_url, is_active, barcode, business_id, discount_price, promotion_description]);
        } catch (err) {
          console.error(`Error importing product ${name}:`, err.message);
        }
      }
      console.log(`Imported ${products.length} products`);
    }

    console.log("Migration and data import process finished.");
  } catch (err) {
    console.error("Connection or critical failure:", err);
  } finally {
    await client.end();
  }
}

migrate();
