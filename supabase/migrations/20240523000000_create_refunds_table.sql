-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  staff_id UUID REFERENCES auth.users(id), -- or profiles(id) depending on schema, usually profiles(id) is safer for FK if profiles exists
  reason TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  items JSONB NOT NULL, -- Stores array of { product_id, quantity, price, subtotal }
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);

-- Add RLS policies (simplified for now)
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON refunds
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON refunds
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
