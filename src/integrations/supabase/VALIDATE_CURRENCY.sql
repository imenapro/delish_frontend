-- Function to validate that a transaction's currency matches the store's currency
CREATE OR REPLACE FUNCTION validate_transaction_currency()
RETURNS TRIGGER AS $$
DECLARE
  store_currency TEXT;
  business_id_val UUID;
BEGIN
  -- Determine business_id based on shop_id
  IF NEW.shop_id IS NOT NULL THEN
    SELECT business_id INTO business_id_val
    FROM shops
    WHERE id = NEW.shop_id;
    
    IF business_id_val IS NOT NULL THEN
      -- Get the store currency
      SELECT currency INTO store_currency
      FROM businesses
      WHERE id = business_id_val;

      -- Check if currency matches
      IF NEW.currency IS NOT NULL AND store_currency IS NOT NULL AND NEW.currency != store_currency THEN
        RAISE EXCEPTION 'Transaction currency (%) does not match store currency (%)', NEW.currency, store_currency;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for expenses
DROP TRIGGER IF EXISTS check_expense_currency ON expenses;
CREATE TRIGGER check_expense_currency
BEFORE INSERT OR UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION validate_transaction_currency();

-- Trigger for payments
DROP TRIGGER IF EXISTS check_payment_currency ON payments;
CREATE TRIGGER check_payment_currency
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION validate_transaction_currency();

-- Trigger for payroll
DROP TRIGGER IF EXISTS check_payroll_currency ON payroll;
CREATE TRIGGER check_payroll_currency
BEFORE INSERT OR UPDATE ON payroll
FOR EACH ROW
EXECUTE FUNCTION validate_transaction_currency();
