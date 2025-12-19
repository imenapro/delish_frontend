-- Add barcode field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Create index for faster barcode lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

COMMENT ON COLUMN products.barcode IS 'Unique barcode for product scanning';