DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    ALTER TABLE public.expenses
      ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS account_id uuid,
      ADD COLUMN IF NOT EXISTS rejected_reason text,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz,
      ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
      ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

    UPDATE public.expenses e
    SET business_id = s.business_id
    FROM public.shops s
    WHERE e.business_id IS NULL
      AND e.shop_id IS NOT NULL
      AND s.id = e.shop_id
      AND s.business_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON public.expenses(business_id, expense_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_shop_date ON public.expenses(shop_id, expense_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON public.expenses(deleted_at);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('cash', 'bank', 'mobile_money', 'card', 'other')),
  currency text NOT NULL,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_business ON public.financial_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_shop ON public.financial_accounts(shop_id);

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'expenses'
        AND constraint_name = 'expenses_account_id_fkey'
    ) THEN
      ALTER TABLE public.expenses
        ADD CONSTRAINT expenses_account_id_fkey
        FOREIGN KEY (account_id) REFERENCES public.financial_accounts(id) ON DELETE SET NULL;
    END IF;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.expense_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  category text NOT NULL,
  period_start date NOT NULL,
  currency text NOT NULL,
  limit_amount numeric NOT NULL CHECK (limit_amount >= 0),
  spent_amount numeric NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, shop_id, category, period_start, currency)
);

CREATE INDEX IF NOT EXISTS idx_expense_budgets_business ON public.expense_budgets(business_id, period_start);

CREATE TABLE IF NOT EXISTS public.financial_monthly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  currency text NOT NULL,
  total_expenses_approved numeric NOT NULL DEFAULT 0 CHECK (total_expenses_approved >= 0),
  total_expenses_pending numeric NOT NULL DEFAULT 0 CHECK (total_expenses_pending >= 0),
  total_expenses_rejected numeric NOT NULL DEFAULT 0 CHECK (total_expenses_rejected >= 0),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, period_start, currency)
);

CREATE INDEX IF NOT EXISTS idx_financial_monthly_summaries_business ON public.financial_monthly_summaries(business_id, period_start);

CREATE TABLE IF NOT EXISTS public.financial_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source_table text NOT NULL,
  source_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_entries_business ON public.financial_ledger_entries(business_id, occurred_at);

CREATE OR REPLACE FUNCTION public.normalize_expense_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_business_id uuid;
  resolved_currency text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.recorded_by IS NULL THEN
      NEW.recorded_by := auth.uid();
    END IF;
  END IF;

  IF NEW.business_id IS NULL AND NEW.shop_id IS NOT NULL THEN
    SELECT s.business_id INTO resolved_business_id
    FROM public.shops s
    WHERE s.id = NEW.shop_id
    LIMIT 1;
    NEW.business_id := resolved_business_id;
  END IF;

  IF NEW.currency IS NULL OR length(trim(NEW.currency)) = 0 THEN
    IF NEW.business_id IS NOT NULL THEN
      SELECT b.currency INTO resolved_currency
      FROM public.businesses b
      WHERE b.id = NEW.business_id
      LIMIT 1;
      NEW.currency := COALESCE(resolved_currency, 'RWF');
    ELSE
      NEW.currency := 'RWF';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
    NEW.updated_at := now();
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      NEW.deleted_by := auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_monthly_summary(
  _business_id uuid,
  _period_start date,
  _currency text,
  _approved_delta numeric,
  _pending_delta numeric,
  _rejected_delta numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.financial_monthly_summaries (
    business_id,
    period_start,
    currency,
    total_expenses_approved,
    total_expenses_pending,
    total_expenses_rejected,
    updated_at
  )
  VALUES (
    _business_id,
    _period_start,
    _currency,
    GREATEST(_approved_delta, 0),
    GREATEST(_pending_delta, 0),
    GREATEST(_rejected_delta, 0),
    now()
  )
  ON CONFLICT (business_id, period_start, currency)
  DO UPDATE SET
    total_expenses_approved = GREATEST(public.financial_monthly_summaries.total_expenses_approved + _approved_delta, 0),
    total_expenses_pending = GREATEST(public.financial_monthly_summaries.total_expenses_pending + _pending_delta, 0),
    total_expenses_rejected = GREATEST(public.financial_monthly_summaries.total_expenses_rejected + _rejected_delta, 0),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_expense_budget(
  _business_id uuid,
  _shop_id uuid,
  _category text,
  _period_start date,
  _currency text,
  _delta numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.expense_budgets
  SET
    spent_amount = GREATEST(spent_amount + _delta, 0),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE business_id = _business_id
    AND category = _category
    AND period_start = _period_start
    AND currency = _currency
    AND (
      (shop_id IS NULL AND _shop_id IS NULL)
      OR shop_id = _shop_id
      OR shop_id IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_expense_financial_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_business_id uuid;
  new_business_id uuid;
  old_shop_id uuid;
  new_shop_id uuid;
  old_account_id uuid;
  new_account_id uuid;
  old_currency text;
  new_currency text;
  old_period date;
  new_period date;
  old_amount numeric;
  new_amount numeric;
  old_status text;
  new_status text;
  old_deleted boolean;
  new_deleted boolean;
  old_approved numeric;
  new_approved numeric;
  approved_delta numeric;
  old_pending numeric;
  new_pending numeric;
  pending_delta numeric;
  old_rejected numeric;
  new_rejected numeric;
  rejected_delta numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_business_id := OLD.business_id;
    old_shop_id := OLD.shop_id;
    old_account_id := OLD.account_id;
    old_currency := COALESCE(OLD.currency, 'RWF');
    old_period := date_trunc('month', OLD.expense_date::timestamptz)::date;
    old_amount := COALESCE(OLD.amount, 0);
    old_status := COALESCE(OLD.status, 'pending');
    old_deleted := OLD.deleted_at IS NOT NULL;

    new_business_id := NULL;
    new_shop_id := NULL;
    new_account_id := NULL;
    new_currency := old_currency;
    new_period := old_period;
    new_amount := 0;
    new_status := 'pending';
    new_deleted := true;
  ELSE
    old_business_id := COALESCE(OLD.business_id, NEW.business_id);
    new_business_id := NEW.business_id;

    old_shop_id := COALESCE(OLD.shop_id, NEW.shop_id);
    new_shop_id := NEW.shop_id;

    old_account_id := COALESCE(OLD.account_id, NEW.account_id);
    new_account_id := NEW.account_id;

    old_currency := COALESCE(OLD.currency, NEW.currency, 'RWF');
    new_currency := COALESCE(NEW.currency, 'RWF');

    old_period := date_trunc('month', COALESCE(OLD.expense_date, NEW.expense_date)::timestamptz)::date;
    new_period := date_trunc('month', NEW.expense_date::timestamptz)::date;

    old_amount := COALESCE(OLD.amount, 0);
    new_amount := COALESCE(NEW.amount, 0);

    old_status := COALESCE(OLD.status, 'pending');
    new_status := COALESCE(NEW.status, 'pending');

    old_deleted := COALESCE(OLD.deleted_at, NULL) IS NOT NULL;
    new_deleted := NEW.deleted_at IS NOT NULL;
  END IF;

  old_approved := CASE WHEN old_status = 'approved' AND NOT old_deleted THEN old_amount ELSE 0 END;
  new_approved := CASE WHEN new_status = 'approved' AND NOT new_deleted THEN new_amount ELSE 0 END;
  approved_delta := new_approved - old_approved;

  old_pending := CASE WHEN old_status = 'pending' AND NOT old_deleted THEN old_amount ELSE 0 END;
  new_pending := CASE WHEN new_status = 'pending' AND NOT new_deleted THEN new_amount ELSE 0 END;
  pending_delta := new_pending - old_pending;

  old_rejected := CASE WHEN old_status = 'rejected' AND NOT old_deleted THEN old_amount ELSE 0 END;
  new_rejected := CASE WHEN new_status = 'rejected' AND NOT new_deleted THEN new_amount ELSE 0 END;
  rejected_delta := new_rejected - old_rejected;

  IF old_business_id IS NOT NULL THEN
    PERFORM public.adjust_monthly_summary(old_business_id, old_period, old_currency, -old_approved, -old_pending, -old_rejected);
  END IF;
  IF new_business_id IS NOT NULL THEN
    PERFORM public.adjust_monthly_summary(new_business_id, new_period, new_currency, new_approved, new_pending, new_rejected);
  END IF;

  IF old_approved > 0 THEN
    PERFORM public.adjust_expense_budget(old_business_id, old_shop_id, OLD.category, old_period, old_currency, -old_approved);
  END IF;
  IF new_approved > 0 THEN
    PERFORM public.adjust_expense_budget(new_business_id, new_shop_id, NEW.category, new_period, new_currency, new_approved);
  END IF;

  IF old_approved > 0 AND old_account_id IS NOT NULL THEN
    UPDATE public.financial_accounts
    SET balance = GREATEST(balance + old_approved, 0),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = old_account_id;
  END IF;

  IF new_approved > 0 AND new_account_id IS NOT NULL THEN
    UPDATE public.financial_accounts
    SET balance = GREATEST(balance - new_approved, 0),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = new_account_id;
  END IF;

  IF approved_delta <> 0 AND new_business_id IS NOT NULL THEN
    INSERT INTO public.financial_ledger_entries (
      business_id,
      shop_id,
      account_id,
      direction,
      amount,
      currency,
      occurred_at,
      source_table,
      source_id,
      created_by
    ) VALUES (
      new_business_id,
      new_shop_id,
      new_account_id,
      CASE WHEN approved_delta > 0 THEN 'debit' ELSE 'credit' END,
      abs(approved_delta),
      new_currency,
      now(),
      'expenses',
      COALESCE(NEW.id, OLD.id),
      auth.uid()
    );
  END IF;

  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_normalize_expense ON public.expenses;
    CREATE TRIGGER trg_normalize_expense
    BEFORE INSERT OR UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.normalize_expense_row();

    DROP TRIGGER IF EXISTS trg_apply_expense_financial_effects ON public.expenses;
    CREATE TRIGGER trg_apply_expense_financial_effects
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.apply_expense_financial_effects();

    DROP TRIGGER IF EXISTS audit_expenses_changes ON public.expenses;
    CREATE TRIGGER audit_expenses_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
  END IF;
END;
$$;

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view expenses for their shops" ON public.expenses;
    DROP POLICY IF EXISTS "Staff can create expenses" ON public.expenses;
    DROP POLICY IF EXISTS "Accountants and admins can manage expenses" ON public.expenses;
    DROP POLICY IF EXISTS "Expenses select" ON public.expenses;
    DROP POLICY IF EXISTS "Expenses insert" ON public.expenses;
    DROP POLICY IF EXISTS "Expenses update" ON public.expenses;
    DROP POLICY IF EXISTS "Expenses delete" ON public.expenses;

    CREATE POLICY "Expenses select"
    ON public.expenses
    FOR SELECT
    TO authenticated
    USING (
      deleted_at IS NULL
      AND (
        has_role(auth.uid(), 'super_admin'::app_role)
        OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
        OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
      )
    );

    CREATE POLICY "Expenses insert"
    ON public.expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (
      deleted_at IS NULL
      AND recorded_by = auth.uid()
      AND (
        has_role(auth.uid(), 'super_admin'::app_role)
        OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
        OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
      )
    );

    CREATE POLICY "Expenses update"
    ON public.expenses
    FOR UPDATE
    TO authenticated
    USING (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
      OR recorded_by = auth.uid()
    )
    WITH CHECK (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
      OR recorded_by = auth.uid()
    );

    CREATE POLICY "Expenses delete"
    ON public.expenses
    FOR DELETE
    TO authenticated
    USING (
      has_role(auth.uid(), 'super_admin'::app_role)
    );
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Financial accounts access" ON public.financial_accounts;
CREATE POLICY "Financial accounts access"
ON public.financial_accounts
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
  OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
  OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
);

DROP POLICY IF EXISTS "Expense budgets access" ON public.expense_budgets;
CREATE POLICY "Expense budgets access"
ON public.expense_budgets
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
  OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
  OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
);

DROP POLICY IF EXISTS "Financial monthly summaries access" ON public.financial_monthly_summaries;
CREATE POLICY "Financial monthly summaries access"
ON public.financial_monthly_summaries
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
);

DROP POLICY IF EXISTS "Financial ledger entries access" ON public.financial_ledger_entries;
CREATE POLICY "Financial ledger entries access"
ON public.financial_ledger_entries
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
  OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
  OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
);

DROP TRIGGER IF EXISTS audit_financial_accounts_changes ON public.financial_accounts;
CREATE TRIGGER audit_financial_accounts_changes
AFTER INSERT OR UPDATE OR DELETE ON public.financial_accounts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_expense_budgets_changes ON public.expense_budgets;
CREATE TRIGGER audit_expense_budgets_changes
AFTER INSERT OR UPDATE OR DELETE ON public.expense_budgets
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_financial_ledger_entries_changes ON public.financial_ledger_entries;
CREATE TRIGGER audit_financial_ledger_entries_changes
AFTER INSERT OR UPDATE OR DELETE ON public.financial_ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

