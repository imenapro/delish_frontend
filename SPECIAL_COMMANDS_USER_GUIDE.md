# User Guide: Special Commands Feature

## Quick Start

### For POS Staff

#### Creating a Special Command

1. **Add Items to Cart**
   - Browse and scan products as normal
   - Add quantities needed for the order

2. **Click "Create Command"** (Purple Package Icon)
   - Located in the cart sidebar alongside other buttons

3. **Fill Customer Details**
   - **Customer Name**: Required (e.g., "John Doe")
   - **Customer Phone**: Required for contact (e.g., "0799123456")
   - **Special Notes**: Optional (e.g., "Custom size, no sugar")

4. **Enter Advance Payment**
   - **Advance Amount**: How much customer pays now
   - Examples:
     - Full payment now: Enter total amount
     - 50% deposit: Enter half the total
     - No deposit (credit): Enter 0
   - System shows remaining due amount in real-time

5. **Select Payment Method**
   - Cash
   - Mobile Money (Airtel Money, MTN Mobile Money, etc.)
   - Card
   - Wallet

6. **Confirm**
   - System generates unique order code (e.g., "CMD-20250205143025-234")
   - Customer receives receipt or code for pickup
   - Cart clears automatically

#### Settling Command Payment on Pickup

1. **Find the Command**
   - Staff has access to pending commands list (future feature)
   - OR customer provides order code

2. **Open "Settle Command" Dialog**
   - Enter order code or select from pending commands

3. **Verify Details**
   - Customer name
   - Total amount
   - Advance already paid
   - Remaining due (highlighted)

4. **Record Final Payment**
   - **Final Payment Amount**: How much customer pays now
   - Can settle full balance or accept partial payment
   - System shows if balance remains

5. **Select Payment Method**
   - Same methods as advance payment

6. **Confirm**
   - Invoice marked as "Paid" (if fully settled)
   - Receipt generated
   - Payment recorded in finance system

---

## Examples

### Example 1: Birthday Cake - 50% Deposit

**Order:**
- 1 × Custom Birthday Cake: 200,000 RWF

**At Time of Order:**
- Total Amount: 200,000 RWF
- Customer Pays Now (Advance): 100,000 RWF (Cash)
- Remaining Due: 100,000 RWF
- Order Code: CMD-20250205082430-127

**At Pickup (Next Day):**
- Customer Pays: 100,000 RWF (Cash)
- Final Payment recorded
- Invoice marked: PAID ✓

---

### Example 2: Corporate Catering - No Deposit

**Order:**
- 5 × Lunch Boxes: 50,000 RWF each
- Total: 250,000 RWF

**At Time of Order:**
- Customer Pays Now (Advance): 0 RWF (Full Credit)
- Remaining Due: 250,000 RWF
- Order Code: CMD-20250205135020-456
- Invoice Status: PARTIAL

**At Pickup (Friday):**
- Customer Pays: 250,000 RWF (Mobile Money)
- Final Payment recorded
- Invoice marked: PAID ✓

---

### Example 3: Wedding Cake - Multiple Deliveries

**Order:**
- 1 × 3-tier Wedding Cake: 500,000 RWF

**1st Payment (One Month Before):**
- Advance: 250,000 RWF (Mobile Money)
- Remaining: 250,000 RWF

**Final Payment (Day Before Delivery):**
- Final Payment: 250,000 RWF (Card)
- Order: CONFIRMED ✓

---

## Finance Impact

### Advance Payment Recording
- **Immediately Recorded**: Advance amount shows in daily sales
- **Finance Entry**: Credit to shop/business
- **Invoice Status**: Marked as "PARTIAL"

### Final Payment Recording
- **Recorded**: When customer settles
- **Finance Entry**: Additional credit for final amount
- **Invoice Status**: Updated to "PAID"

### Reports & Analytics
All command payments are tracked and available in:
- Daily sales reports (both advance and final)
- Customer payment history
- Command fulfillment dashboard (coming soon)

---

## Tips & Best Practices

### For Creating Commands
✓ Always note any special requests in the "Notes" field
✓ Confirm customer phone number for reminder communications
✓ Consider requiring at least 25-50% advance to reduce no-shows
✓ Set clear pickup time during order creation

### For Settling Commands
✓ Verify customer identity before settling
✓ Accept partial payments if customer requests
✓ Always note reason for partial settlements
✓ Generate receipt for final payment proof

### For Finance Tracking
✓ Commands show advance payment on creation date
✓ Final payment shows on settlement date
✓ Both amounts counted in daily sales totals
✓ Unpaid balances visible in aging report

---

## Troubleshooting

### "Can't Create Command - Advance Amount Error"
- Check that advance amount ≤ total order amount
- Advance can be 0 (for full credit orders)

### "Final Payment Amount Exceeds Remaining Due"
- Customer may have already paid balance
- Or you're trying to collect more than owed
- Verify remaining amount before taking payment

### Missing Order Code
- Check email/SMS if sent to customer
- Order code format: CMD-YYYYMMDDHHMMSS-XXX
- Staff will also have it in pending commands list

### Can't Find Command to Settle
- Verify order code is correct
- Order must be in "pending" status
- Check if order is from today or previous days

---

## Security & Permissions

- Only authorized POS staff can create/settle commands
- All payments traced to staff member recording
- Command history is auditable
- Payments cannot be deleted, only amended with notes

---

## Future Features Coming Soon

- **Pending Commands Dashboard**: View all unpaid commands
- **Customer Reminders**: Auto-SMS/email about pickup
- **Analytics**: Advance payment conversion tracking
- **Multiple Payments**: Record multiple final payments
- **Refunds**: Handle cancellations and refunds
- **Recurring Commands**: Auto-generate for regular orders

---

For questions or issues, contact your supervisor or system administrator.
