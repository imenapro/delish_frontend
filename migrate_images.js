import { createClient } from '@supabase/supabase-js';

const OLD_URL = "https://hjaiwwoxuympbvjmakpa.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYWl3d294dXltcGJ2am1ha3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAzMDg1NCwiZXhwIjoyMDc3NjA2ODU0fQ.zndd6xzsveSJoYCPvMcOfWmA8WFIyMqV5A0ssxjyHwg";

const NEW_URL = "https://jcdaovmwmpkflccecsrg.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGFvdm13bXBrZmxjY2Vjc3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc1OTYxMywiZXhwIjoyMDg1MzM1NjEzfQ._Id8uhTTGh31JA8vXBebb1vgLeE7xuC5KCDQZ9wQMdU";

const oldSupabase = createClient(OLD_URL, OLD_KEY);
const newSupabase = createClient(NEW_URL, NEW_KEY);

async function migrateProductImages() {
    console.log("Starting Product Images Migration...");

    try {
        // 1. Ensure bucket exists in new project
        const { data: buckets } = await newSupabase.storage.listBuckets();
        if (!buckets.find(b => b.id === 'product-images')) {
            console.log("Creating product-images bucket...");
            await newSupabase.storage.createBucket('product-images', { public: true });
        }

        // 2. List all files in 'products' folder of old project
        console.log("Listing files from old project...");
        const { data: files, error: listError } = await oldSupabase.storage.from('product-images').list('products', { limit: 1000 });
        if (listError) throw listError;

        console.log(`Found ${files.length} files to migrate.`);

        for (const file of files) {
            if (file.name === '.emptyFolderPlaceholder') continue;

            console.log(`Migrating ${file.name}...`);
            
            // a. Download from old
            const { data: blob, error: downloadError } = await oldSupabase.storage.from('product-images').download(`products/${file.name}`);
            if (downloadError) {
                console.error(`Error downloading ${file.name}:`, downloadError.message);
                continue;
            }

            // b. Upload to new
            const { error: uploadError } = await newSupabase.storage.from('product-images').upload(`products/${file.name}`, blob, {
                contentType: file.metadata.mimetype,
                upsert: true
            });

            if (uploadError) {
                console.error(`Error uploading ${file.name}:`, uploadError.message);
            } else {
                console.log(`Successfully migrated ${file.name}`);
            }
        }

        // 3. Update product image URLs in the new database
        console.log("\nUpdating product image URLs in database...");
        const { data: products } = await newSupabase.from('products').select('id, image_url');
        
        for (const product of products) {
            if (product.image_url && product.image_url.includes(OLD_URL)) {
                const newImageUrl = product.image_url.replace(OLD_URL, NEW_URL);
                await newSupabase.from('products').update({ image_url: newImageUrl }).eq('id', product.id);
            }
        }

        console.log("\nMigration completed successfully!");

    } catch (err) {
        console.error("Migration failed:", err.message);
    }
}

migrateProductImages();
