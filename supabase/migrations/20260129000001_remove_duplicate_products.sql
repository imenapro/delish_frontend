-- Remove duplicate products, keeping the most recently created one
DELETE FROM products
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY name, business_id 
             ORDER BY created_at DESC, id DESC
           ) as rnum
    FROM products
  ) t
  WHERE t.rnum > 1
);

-- Optional: Add a unique index to prevent future duplicates at the database level
-- We use a unique index instead of constraint to handle NULL business_id if necessary,
-- though standard unique constraint treats NULLs as distinct. 
-- For strict enforcement within a business, this is good.
-- DO NOT run this if you want to allow duplicates for some reason.
-- CREATE UNIQUE INDEX IF NOT EXISTS products_name_business_id_idx ON products (name, business_id);
