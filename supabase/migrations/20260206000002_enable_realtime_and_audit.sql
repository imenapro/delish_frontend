
-- Enable Realtime for Orders and Expenses
BEGIN;
  -- Add tables to publication if they are not already (Postgres 15+ supports ADD TABLE IF NOT EXISTS via some tricks, but standard ADD TABLE throws if exists in some versions. 
  -- Supabase usually handles 'ALTER PUBLICATION supabase_realtime ADD TABLE ...' gracefully or we can ignore error.)
  -- Safest way in raw SQL without knowing version:
  DO $$
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE orders';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- table already in publication
  WHEN OTHERS THEN
    NULL; -- other errors (like publication not existing, which shouldn't happen)
  END;
  $$;

  DO $$
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE expenses';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  WHEN OTHERS THEN
    NULL;
  END;
  $$;
COMMIT;

-- Create Audit Log Function for Financial Transactions
CREATE OR REPLACE FUNCTION public.log_financial_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_details TEXT;
  v_user_id UUID;
BEGIN
  -- Attempt to get user ID, might be null if system action or service role without setting claim
  v_user_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE_' || UPPER(TG_TABLE_NAME);
    IF TG_TABLE_NAME = 'orders' THEN
        v_details := 'New Order ' || NEW.order_code || ' created. Amount: ' || NEW.total_amount || '. Shop: ' || NEW.shop_id_origin;
    ELSIF TG_TABLE_NAME = 'expenses' THEN
        v_details := 'New Expense created. Amount: ' || NEW.amount || '. Category: ' || NEW.category;
    ELSE
        v_details := 'Created ' || TG_TABLE_NAME || ' ID: ' || NEW.id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE_' || UPPER(TG_TABLE_NAME);
    IF TG_TABLE_NAME = 'orders' THEN
        v_details := 'Order ' || NEW.order_code || ' updated. Status: ' || OLD.status || ' -> ' || NEW.status;
    ELSIF TG_TABLE_NAME = 'expenses' THEN
        v_details := 'Expense updated. Status: ' || OLD.status || ' -> ' || NEW.status;
    ELSE
        v_details := 'Updated ' || TG_TABLE_NAME || ' ID: ' || NEW.id;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (action, details, performed_by)
  VALUES (v_action, v_details, v_user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Triggers
DROP TRIGGER IF EXISTS on_order_audit ON public.orders;
CREATE TRIGGER on_order_audit
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_financial_transaction();

DROP TRIGGER IF EXISTS on_expense_audit ON public.expenses;
CREATE TRIGGER on_expense_audit
AFTER INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_financial_transaction();
