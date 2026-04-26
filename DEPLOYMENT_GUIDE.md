# Deployment Instructions

## Quick Start

1. **Apply Database Migration**
   ```bash
   # Navigate to project root
   cd /path/to/delish/v_0_1/bake-sync/bake-sync
   
   # Push migration to Supabase
   supabase db push
   ```

2. **Restart Development Server**
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart
   npm run dev
   ```

3. **Test the Feature**
   - Go to POS
   - Add items to cart
   - Click purple package icon (Create Command)
   - Follow the dialog

## Migration Details

The migration file `20260205000001_add_special_commands.sql` contains:

### 1. New Columns on `orders` Table
```sql
ALTER TABLE public.orders ADD COLUMN order_type TEXT DEFAULT 'regular';
ALTER TABLE public.orders ADD COLUMN advance_paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN remaining_due DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
```

### 2. New `command_payments` Table
Creates table to track advance and final payments separately.

### 3. Two RPC Functions
- `create_command_with_advance()` - Creates command with advance payment
- `settle_command()` - Records final settlement payment

### 4. Row Level Security
Policies applied to control access to command_payments.

## Verification

After migration, verify:

1. **Check migration applied**
   ```sql
   SELECT * FROM public.orders LIMIT 1;
   -- Should show new columns: order_type, advance_paid, remaining_due, customer_name, customer_phone
   ```

2. **Check new table exists**
   ```sql
   SELECT * FROM public.command_payments;
   -- Should exist and be empty initially
   ```

3. **Check RPC functions**
   ```sql
   SELECT * FROM pg_proc WHERE proname IN ('create_command_with_advance', 'settle_command');
   -- Should return 2 functions
   ```

## Troubleshooting

### Migration Fails
- Ensure Supabase CLI is installed: `supabase --version`
- Check database connection: `supabase status`
- Verify you have permissions to modify schema

### Functions Not Found
- Ensure migration completed successfully
- Check Supabase dashboard for any errors
- Restart dev server after migration

### UI Shows "Function Not Found" Error
- Verify RPC functions were created
- Clear browser cache and reload
- Check Supabase console for function details

## Rollback

If needed to rollback:

```bash
# Revert migration
supabase migration remove

# Or manually:
DROP FUNCTION IF EXISTS public.create_command_with_advance CASCADE;
DROP FUNCTION IF EXISTS public.settle_command CASCADE;
DROP TABLE IF EXISTS public.command_payments CASCADE;
ALTER TABLE public.orders DROP COLUMN IF EXISTS order_type;
ALTER TABLE public.orders DROP COLUMN IF EXISTS advance_paid;
ALTER TABLE public.orders DROP COLUMN IF EXISTS remaining_due;
ALTER TABLE public.orders DROP COLUMN IF EXISTS customer_name;
ALTER TABLE public.orders DROP COLUMN IF EXISTS customer_phone;
```

## Environment Check

Ensure you have:
- [ ] Node.js 16+ installed
- [ ] Supabase CLI installed: `supabase --version`
- [ ] Connected to correct Supabase project
- [ ] Database password/access available
- [ ] Read/Write permissions on database

## Post-Deployment

1. **Notify Staff**: Share SPECIAL_COMMANDS_USER_GUIDE.md
2. **Monitor**: Watch for any RPC errors in logs
3. **Feedback**: Collect staff feedback after first usage
4. **Document**: Update your internal documentation

## Support Matrix

| Issue | Solution | Reference |
|-------|----------|-----------|
| Can't create command | Check migration deployed | Check database |
| Payment amount validation fails | Review form validation | POSCommandDialog.tsx |
| Settlement fails | Verify remaining amount | POSSettleCommandDialog.tsx |
| Finance not recording | Check RPC success response | TECHNICAL.md |
| Order code not displaying | Check toast notification | TenantPOS.tsx |

## Timeline

- **Preparation**: 5 minutes (run migration)
- **Testing**: 15-30 minutes (create test commands)
- **Staff Training**: 30 minutes (walkthrough guide)
- **Go Live**: When team is ready

---

**Migration File Location**: 
`supabase/migrations/20260205000001_add_special_commands.sql`

**Last Updated**: 2025-02-05
**Status**: Ready for Deployment
