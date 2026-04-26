# Special Commands with Advance Payments - Implementation Guide

## Overview
The special commands feature allows POS staff to create orders for customers who want to pay partially now (advance payment) and settle the remaining balance later when they pick up the order.

## Features Implemented

### 1. **Database Schema** 
Extended the `orders` table with:
- `order_type` - Distinguishes between 'regular' orders and 'commands'
- `advance_paid` - Amount paid upfront
- `remaining_due` - Amount still owed
- `customer_name` - Customer name for the command
- `customer_phone` - Customer phone number

Created new `command_payments` table to track:
- Each advance and final payment
- Payment method, amount, and date
- Who recorded the payment

### 2. **Backend RPC Functions**

#### `create_command_with_advance()`
Creates a special command order with advance payment tracking.

**Parameters:**
- `p_shop_id` - Shop ID
- `p_user_id` - User/staff ID
- `p_customer_name` - Customer name
- `p_customer_phone` - Customer phone
- `p_items` - Array of items with product_id, quantity, unit_price
- `p_total_amount` - Total order amount
- `p_advance_paid` - Advance payment amount
- `p_payment_method` - 'cash', 'mobile_money', 'card', or 'wallet'
- `p_pos_session_id` - Active POS session (optional)
- `p_notes` - Special instructions (optional)

**Returns:**
```json
{
  "order_id": "uuid",
  "order_code": "CMD-20260205HHMMSS-XXX",
  "invoice_number": "INV-...",
  "total_amount": 50000,
  "advance_paid": 20000,
  "remaining_due": 30000,
  "created_at": "2025-02-05T...",
  "success": true
}
```

#### `settle_command()`
Records the final payment when customer comes to pick up.

**Parameters:**
- `p_order_id` - Command order ID
- `p_final_payment` - Amount being paid now
- `p_payment_method` - Payment method
- `p_user_id` - Staff recording the payment
- `p_notes` - Payment notes (optional)

**Returns:**
```json
{
  "order_id": "uuid",
  "final_payment": 30000,
  "remaining_due": 0,
  "status": "confirmed",
  "success": true
}
```

### 3. **UI Components**

#### `POSCommandDialog`
Modal dialog for creating commands with advance payments.

**Features:**
- Customer name and phone input
- Advance amount selection
- Payment method selection (Cash, Mobile Money, Card, Wallet)
- Shows remaining due amount in real-time
- Order summary with item count and total
- Optional special notes for preparation

#### `POSSettleCommandDialog`
Modal dialog for settling remaining balance.

**Features:**
- Displays command details (order code, customer, phone)
- Shows payment breakdown (total, advance paid, remaining due)
- Final payment input with validation
- Shows remaining balance after payment
- Payment method selection
- Optional payment notes

### 4. **POS Cart Integration**
Added new button to POSCart:
- **Create Command** button (Purple package icon)
- Appears alongside existing checkout, park, and clear buttons
- Only enabled when cart has items

## Workflow

### Creating a Special Command

1. **Build Cart**: Add products to cart as normal
2. **Create Command**: Click the purple package icon in the cart
3. **Enter Customer Details**:
   - Customer name
   - Phone number
   - Special preparation notes (optional)
4. **Select Advance Payment**:
   - Enter advance amount (can be 0 for full credit)
   - Select payment method
5. **Confirm**: System generates order code and records advance payment
6. **Display**: Order code shown to staff and customer

### Settling the Command Payment

1. **Customer Pickup**: Customer returns to pick up order
2. **Settle Payment**: Staff finds and opens the command
3. **Enter Payment**: 
   - Final payment amount
   - Payment method
   - Optional payment notes
4. **Confirm**: System records payment and updates order status

## Database Fields

### Orders Table (Extended)
```sql
order_type VARCHAR(20) DEFAULT 'regular'  -- 'regular' or 'command'
advance_paid DECIMAL(10,2) DEFAULT 0      -- Amount paid upfront
remaining_due DECIMAL(10,2) DEFAULT 0     -- Amount still owed
customer_name TEXT                         -- For commands
customer_phone TEXT                        -- For commands
```

### Command_Payments Table (New)
```sql
id UUID PRIMARY KEY
order_id UUID REFERENCES orders(id)
payment_type TEXT                          -- 'advance' or 'final'
amount DECIMAL(10,2)
payment_method VARCHAR(50)                 -- 'cash', 'mobile_money', 'card', 'wallet'
paid_at TIMESTAMP
created_by UUID REFERENCES profiles(id)
notes TEXT
created_at TIMESTAMP
```

## Finance Recording

### Advance Payment
- Recorded in `command_payments` table with type='advance'
- Amount is credited to daily sales immediately
- Invoice marked as 'partial' status

### Final Settlement
- Recorded in `command_payments` table with type='final'
- Updates remaining_due balance
- When fully paid, order status changes to 'confirmed' and invoice marked as 'paid'

## Order Status Transitions

For Special Commands:
1. Created in **'pending'** status (awaiting pickup)
2. Updated to **'confirmed'** (when fully paid)
3. Can transition to **'preparing'**, **'ready'**, etc. as per normal workflow
4. If partial payment: remains **'pending'** until fully settled

## Integration Points

### POSPaymentDialog
Still used for regular POS sales (full payment at time of sale).

### POSCommandDialog
New dialog for creating advance payment commands.

### POSSettleCommandDialog
New dialog for settling command balances on pickup.

### POSCart
Updated with:
- New `onCommand` callback
- Package icon button for command creation
- Grid layout adjustment for new button

## Error Handling

### Command Creation Errors
- Customer name/phone validation
- Advance amount must be ≤ total amount
- Payment method validation
- Server RPC error handling

### Settlement Errors
- Final payment cannot exceed remaining due
- Order must exist and be a command
- Payment method validation
- Session/auth validation

## Future Enhancements

1. **Command Queue View**: Dashboard showing pending commands by customer/date
2. **Reminders**: Notify staff of commands ready for pickup
3. **Analytics**: Track advance vs full payment patterns
4. **Multiple Partial Payments**: Allow multiple final payments
5. **Customer Management**: Link commands to customer profiles for reordering
6. **Printing**: Custom receipt templates for advance vs final payments

## Testing Checklist

- [ ] Create command with various advance amounts
- [ ] Create command with $0 advance (full credit)
- [ ] Settle command with exact remaining amount
- [ ] Settle command with partial final payment
- [ ] Try settling with amount > remaining due (should error)
- [ ] Verify finance records for both payments
- [ ] Test all payment methods
- [ ] Verify order codes are unique
- [ ] Check invoice generation for partial payments
- [ ] Ensure POS session sales are updated correctly
