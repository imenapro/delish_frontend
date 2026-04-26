# Special Commands - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   POS Interface (React)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ POSCart Component                                    │   │
│  │ - Render cart items                                  │   │
│  │ - [Pay Now] [Park] [Create Command] buttons          │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ POSCommandDialog                                     │   │
│  │ - Customer info (name, phone)                        │   │
│  │ - Advance amount input                               │   │
│  │ - Payment method selection                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────────────────────────────┐
        │   React Query Mutation                    │
        │   createCommandMutation                   │
        └──────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         Supabase RPC Layer                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ create_command_with_advance()                        │   │
│  │ - Validate inputs                                    │   │
│  │ - Generate order code                               │   │
│  │ - Insert order (order_type='command')                │   │
│  │ - Insert order items                                │   │
│  │ - Record advance payment                            │   │
│  │ - Generate invoice                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         Postgres Database (Supabase)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ orders (extended)                                   │   │
│  │ - order_type='command'                              │   │
│  │ - advance_paid, remaining_due                       │   │
│  │ - customer_name, customer_phone                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ order_items                                          │   │
│  │ - Links to products ordered                         │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ command_payments (new table)                         │   │
│  │ - type='advance' | 'final'                          │   │
│  │ - Tracks all payments for commands                  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ invoices                                             │   │
│  │ - status='partial' (for unpaid) | 'paid'            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Creating a Command

```
User Action: Click "Create Command"
   ↓
POSCommandDialog renders
   ↓
User enters:
  - customer_name
  - customer_phone
  - advance_amount
  - payment_method
  - notes (optional)
   ↓
Form validation (zod schema)
   ↓
Submit via createCommandMutation
   ↓
Call: supabase.rpc('create_command_with_advance', {
  p_shop_id: activeSession.shop_id,
  p_user_id: user.id,
  p_customer_name: "John Doe",
  p_customer_phone: "+250799123456",
  p_items: [
    { product_id, quantity, unit_price, name },
    ...
  ],
  p_total_amount: 200000,
  p_advance_paid: 80000,
  p_payment_method: "cash",
  p_pos_session_id: session.id,
  p_notes: "Special requests"
})
   ↓
RPC Function Execution:
  1. Generate order_code (CMD-20250205HHMMSS-XXX)
  2. INSERT into orders:
     - order_code
     - customer_id (seller_id = user.id)
     - total_amount: 200000
     - advance_paid: 80000
     - remaining_due: 120000
     - order_type: 'command'
     - customer_name
     - customer_phone
     - status: 'pending'
  3. INSERT into order_items (for each item)
  4. INSERT into command_payments:
     - order_id
     - payment_type: 'advance'
     - amount: 80000
     - payment_method: 'cash'
  5. INSERT into invoices:
     - order_code as reference
     - status: 'partial' (since 80k < 200k)
  6. RETURN {order_id, order_code, remaining_due, ...}
   ↓
onSuccess callback:
  - Clear cart
  - Close dialog
  - Show toast: "Command created! Order code: CMD-20250205..."
  - Invalidate queries for session stats
   ↓
Display order code to customer
```

### Settling a Command

```
User Action: Open pending command
   ↓
POSSettleCommandDialog renders with command details
   ↓
User enters:
  - final_payment amount
  - payment_method
  - notes (optional)
   ↓
Form validation
   ↓
Submit via settleCommandMutation
   ↓
Call: supabase.rpc('settle_command', {
  p_order_id: command.id,
  p_final_payment: 120000,
  p_payment_method: "cash",
  p_user_id: user.id,
  p_notes: "Customer settled full balance"
})
   ↓
RPC Function Execution:
  1. SELECT * FROM orders WHERE id=order_id AND order_type='command'
  2. Validate: final_payment <= remaining_due
  3. Calculate new_remaining: remaining_due - final_payment
  4. INSERT into command_payments:
     - order_id
     - payment_type: 'final'
     - amount: 120000
     - payment_method: 'cash'
     - created_by: user.id
  5. UPDATE orders:
     - remaining_due = new_remaining
     - status = CASE
         WHEN new_remaining <= 0 THEN 'confirmed'
         ELSE 'pending'
       END
  6. If new_remaining <= 0:
     UPDATE invoices SET status='paid'
  7. RETURN {order_id, final_payment, remaining_due: 0, status: 'confirmed'}
   ↓
onSuccess callback:
  - Close dialog
  - Clear selection
  - Show toast: "Command payment settled!"
  - Invalidate session queries
   ↓
Update UI to reflect paid status
```

## Component Hierarchy

```
TenantPOS (Page)
│
├── POSProductGrid (left side)
│
├── POSCart
│   ├── Items list
│   ├── Subtotal
│   ├── Tax
│   ├── Total
│   └── Buttons:
│       ├── [Clear] (red)
│       ├── [Park] (orange)
│       ├── [Create Command] (purple) ← NEW
│       └── [Pay Now] (blue)
│
├── POSPaymentDialog
│   └── Standard payment flow
│
├── POSCommandDialog ← NEW
│   ├── Customer info section
│   ├── Order summary
│   ├── Payment details section
│   ├── Advance amount input
│   ├── Payment method radio
│   └── Notes input
│
└── POSSettleCommandDialog ← NEW
    ├── Command details
    ├── Payment summary
    ├── Final payment input
    ├── Payment method radio
    └── Notes input
```

## State Management

### TenantPOS State

```typescript
// Existing
const [cart, setCart] = useState<CartItem[]>([]);
const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);

// New for commands
const [commandDialogOpen, setCommandDialogOpen] = useState(false);
const [settleCommandDialogOpen, setSettleCommandDialogOpen] = useState(false);
const [selectedCommandToSettle, setSelectedCommandToSettle] = useState<CommandToSettle | null>(null);
const [pendingCommands, setPendingCommands] = useState<CommandToSettle[]>([]);
```

### Mutations

```typescript
// Existing
const createOrderMutation = useMutation({
  mutationFn: async ({paymentMethod, ...}) => {...}
});

// New
const createCommandMutation = useMutation({
  mutationFn: async ({customer_name, customer_phone, advance_amount, ...}) => {...}
});

const settleCommandMutation = useMutation({
  mutationFn: async ({order_id, final_payment, ...}) => {...}
});
```

## Database Schema Changes

### Missing Columns Added to `orders` Table

```sql
ALTER TABLE public.orders ADD COLUMN order_type TEXT DEFAULT 'regular';
ALTER TABLE public.orders ADD COLUMN advance_paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN remaining_due DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
```

### New `command_payments` Table

```sql
CREATE TABLE public.command_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('advance', 'final')),
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_command_payments_order_id ON command_payments(order_id);
CREATE INDEX idx_command_payments_payment_type ON command_payments(payment_type);
```

## RPC Functions

### Function 1: `create_command_with_advance()`

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.create_command_with_advance(
    p_shop_id UUID,
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_advance_paid NUMERIC,
    p_payment_method TEXT,
    p_pos_session_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
```

**Key Logic:**
1. Calculate `remaining_due = total - advance`
2. Generate unique `order_code` with timestamp and random suffix
3. Insert order with `order_type='command'`
4. Insert order items
5. For advance > 0: Insert into `command_payments` (type='advance')
6. Generate invoice with appropriate status
7. Return success response

### Function 2: `settle_command()`

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.settle_command(
    p_order_id UUID,
    p_final_payment NUMERIC,
    p_payment_method TEXT,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
```

**Key Logic:**
1. Fetch command order with validation
2. Check: `final_payment <= remaining_due`
3. Calculate `new_remaining = remaining_due - final_payment`
4. Insert into `command_payments` (type='final')
5. Update order:
   - `remaining_due = new_remaining`
   - `status = 'confirmed'` if fully paid
6. If fully paid: Update invoice `status='paid'`
7. Return success response

## Error Handling

### Validation Errors
- Customer name empty → "Customer name is required"
- Phone invalid → "Valid phone number required"
- Advance > total → Use zod validation
- Final payment > remaining → RPC validation

### Business Logic Errors
- Command not found → RPC returns {success: false, error: "..."}
- Insufficient permissions → RLS policies prevent access
- Session inactive → "No active shift"

### Network Errors
```typescript
onError: (error: Error) => {
  toast.error(error.message || 'Failed to create command');
  // Optionally log to Sentry/analytics
}
```

## Performance Considerations

1. **Order Code Generation**: Timestamp-based with random suffix (O(1))
2. **RPC Single Transaction**: All operations in single transaction (atomicity)
3. **Invoice Generation**: Deferred with error handling (non-blocking)
4. **Query Invalidation**: Selective to avoid cascade refetches
5. **Indexes**: Created on `order_id` and `payment_type` for fast lookup

## Security & RLS

### RLS Policies on `command_payments`

**SELECT:**
- Users can view payments for orders they have access to
- Admins/managers can view all

**INSERT:**
- Only staff with appropriate roles can record payments
- Tied to accessible orders

## Testing Recommendations

```typescript
// Unit test: Command creation validation
test('should validate advance amount <= total', async () => {
  // Advance: 300000, Total: 200000 → Should fail
});

// Integration test: Full command lifecycle
test('should create and settle command', async () => {
  // 1. Create command with 50% advance
  // 2. Verify order_type='command', advance_paid=100k
  // 3. Verify command_payments record exists (type='advance')
  // 4. Settle with remaining amount
  // 5. Verify remaining_due=0, order status='confirmed'
  // 6. Verify command_payments record exists (type='final')
});

// E2E test: POS workflow
test('should handle complete command workflow in UI', async () => {
  // 1. Add items to cart
  // 2. Click "Create Command"
  // 3. Fill form and submit
  // 4. Verify success toast
  // 5. Clear cart verification
});
```

## Future Extensibility

### Points for Enhancement
1. **Command Queue Components**: Display pending commands by date/customer
2. **Multiple Partial Payments**: Enhance RPC to allow > 2 payments
3. **Refunds**: Add refund payment type and reversal logic
4. **Customer Integration**: Link commands to customer profile
5. **Notifications**: SMS/email reminders for pickups
6. **Analytics**: Dashboard for advance payment metrics

### API Compatibility
- RPC functions designed to be versioned (v2 can extend without breaking v1)
- Database schema uses DEFAULT values for backward compatibility
- Enums for payment_type allow easy extension (add 'refund', 'adjustment', etc.)

---

**Migration File**: `supabase/migrations/20260205000001_add_special_commands.sql`

**Components:**
- `src/components/pos/POSCommandDialog.tsx`
- `src/components/pos/POSSettleCommandDialog.tsx`

**Pages Updated:**
- `src/pages/tenant/TenantPOS.tsx`
- `src/components/pos/POSCart.tsx`

**Documentation:**
- `SPECIAL_COMMANDS_IMPLEMENTATION.md` (technical)
- `SPECIAL_COMMANDS_USER_GUIDE.md` (user-facing)
