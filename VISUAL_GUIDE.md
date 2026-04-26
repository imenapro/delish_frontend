# Special Commands - Visual Workflow Guide

## POS Interface Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ POINT OF SALE                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│ │  PRODUCTS               │  │  CART                            │  │
│ ├─────────────────────────┤  ├──────────────────────────────────┤  │
│ │                         │  │  Cake (1x)        ........  50000 │  │
│ │  [Cake]  [Bread]        │  │  Bread (2x)       ........  10000 │  │
│ │  [Coffee] [Milk]        │  │  Coffee (1x)      ........   5000 │  │
│ │                         │  │                                  │  │
│ │                         │  ├──────────────────────────────────┤  │
│ │                         │  │  Subtotal:              65000   │  │
│ │                         │  │  Tax:                    6500   │  │
│ │                         │  │  ─────────────────────────────  │  │
│ │                         │  │  Total:                 71500   │  │
│ │                         │  │                                  │  │
│ │                         │  │  [×] [⊕] [📦] [💳]              │  │
│ │                         │  │  Clear Park Command Payment      │  │
│ │                         │  └──────────────────────────────────┘  │
│ │                                                                   │
└─────────────────────────────────────────────────────────────────────┘

Legend:
[×]      = Clear Cart
[⊕]      = Park Order
[📦]     = Create Command ← NEW
[💳]     = Pay Now (existing)
```

## Command Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Click [📦] Create Command Button                           │
└────────────────────┬────────────────────────────────────────┘
                     │
           ┌─────────▼────────┐
           │ POSCommandDialog │
           └─────────┬────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
     ▼               ▼               ▼
 ┌────────────┐ ┌──────────┐ ┌─────────────┐
 │ CUSTOMER   │ │ ITEMS    │ │ PAYMENT     │
 │ INFO       │ │ SUMMARY  │ │ DETAILS     │
 ├────────────┤ ├──────────┤ ├─────────────┤
 │ Name: ___  │ │ 1 × Cake │ │ Advance:  _ │
 │ Phone: ___ │ │ 2 × Bread│ │ Total: 71500│
 │            │ │ 1 × Coff │ │ Due: ______│
 │            │ │          │ │ Method: ○ ○│
 │            │ │ Total:   │ │ ➜ Cash    │
 │            │ │ 71500    │ │ ➜ Mobile  │
 │ Notes: ___ │ │          │ │ ➜ Card    │
 │ (optional) │ │          │ │ ➜ Wallet  │
 └────────────┘ └──────────┘ └─────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                  [✓ Create] [✗ Cancel]
                        │
                        ▼
              ┌──────────────────────┐
              │ RPC: Create Command  │
              │ - Insert Order       │
              │ - Insert Items       │
              │ - Record Advance Pay │
              │ - Generate Invoice   │
              └──────────┬───────────┘
                         │
                ┌────────▼────────┐
                │    Success      │
                ├─────────────────┤
                │ Order Code:     │
                │ CMD-20250205... │
                │                 │
                │ Advance Paid: ✓ │
                └─────────────────┘
                         │
                ┌────────▼────────┐
                │ Cart Cleared    │
                │ Dialog Closed   │
                │ Toast Shown     │
                └─────────────────┘
```

## Settlement Flow (Pickup Day)

```
┌────────────────────────────────────────┐
│  Customer: "I'm here for pickup"       │
│  Staff: "What's your order code?"      │
│  Customer: "CMD-20250205143025-234"    │
└────────────────┬───────────────────────┘
                 │
         ┌───────▼─────────┐
         │ Enter Order Code│
         │ (or search list)│
         └───────┬─────────┘
                 │
         ┌───────▼───────────────────────┐
         │ POSSettleCommandDialog Opens   │
         └───────┬───────────────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
 ┌────────┐ ┌──────────┐ ┌─────────────┐
 │ COMMAND│ │ PAYMENT  │ │ FINAL PAY   │
 │ DETAILS│ │ SUMMARY  │ │ DETAILS     │
 ├────────┤ ├──────────┤ ├─────────────┤
 │ Code:  │ │ Total:   │ │ Amount: ___ │
 │ CMD... │ │ 71500    │ │ Method: ○ ○ │
 │        │ │          │ │ ➜ Cash     │
 │ Name:  │ │ Advance: │ │ ➜ Mobile   │
 │ Sarah  │ │ Paid: 30000
 │        │ │          │ │ ➜ Card     │
 │ Phone: │ │ Remaining│ │ ➜ Wallet   │
 │ 0799...│ │ Due: 41500 │              │
 │        │ │          │ │ Notes: ____ │
 └────────┘ └──────────┘ └─────────────┘
     │           │           │
     └───────────┼───────────┘
                 │
                 │ Input: Paid 41500
                 │        Cash
                 │
          [✓ Settle] [✗ Cancel]
                 │
                 ▼
      ┌──────────────────────┐
      │ RPC: Settle Command  │
      │ - Record Payment     │
      │ - Update Balance     │
      │ - Mark as Confirmed  │
      └──────────┬───────────┘
                 │
        ┌────────▼────────┐
        │  Success        │
        ├─────────────────┤
        │ Remaining: 0    │
        │ Status: PAID ✓  │
        │ Receipt Gen'd   │
        │ Finance Updat'd │
        └─────────────────┘
```

## Order Status Lifecycle

```
SPECIAL COMMAND ORDER LIFECYCLE
═══════════════════════════════════════════════════════════════

Created
  │
  ├─ [create_command_with_advance()]
  │  ├─ Order inserted: status='pending'
  │  ├─ Advance payment recorded
  │  └─ Invoice: status='partial'
  │
  ▼
PENDING
(Waiting for customer to collect)
  │
  ├─ Advance Paid: YES ✓
  ├─ Remaining Due: YES 
  ├─ Invoice: PARTIAL (% paid)
  │
  │ Time passes...
  │
  ▼
CUSTOMER ARRIVES FOR PICKUP
  │
  ├─ [settle_command()]
  │  ├─ Final payment recorded
  │  └─ remaining_due updated
  │
  ├─ Is fully paid?
  │  │
  │  ├─ YES: Order → CONFIRMED
  │  │       Invoice → PAID ✓
  │  │
  │  └─ NO: Order stays PENDING
  │         Invoice stays PARTIAL
  │
  ▼
CONFIRMED / READY
(Depending on business flow)
  │
  ├─ Can proceed to 'preparing'
  ├─ Then 'ready'
  ├─ Then 'delivered'
  │
  └─ All payments recorded ✓


EXAMPLE: 50% ADVANCE PAYMENT
═══════════════════════════════════════════════════════════════

Day 1: Order Created
  Status: 'pending'
  Total: 100,000
  Advance Paid: 50,000
  Remaining Due: 50,000
  Invoice: 'partial' (50% paid)
  Flow: CREATE → pending

  ┌─ command_payments records:
  │  └─ {type: 'advance', amount: 50000, date: 2025-02-05}
  │
  └─ Finance: +50,000 to daily sales

Day 3: Customer Pickup
  Settle Command: Final payment 50,000
  Status: 'confirmed'
  Remaining Due: 0
  Invoice: 'paid' ✓
  Flow: PENDING → confirmed

  ┌─ command_payments records:
  │  ├─ {type: 'advance', amount: 50000, date: 2025-02-05}
  │  └─ {type: 'final', amount: 50000, date: 2025-02-07}
  │
  └─ Finance: +50,000 to daily sales
     (now on different date)
```

## Payment Method Icons

```
Cash          Mobile Money    Card         Wallet
 💰              📱           💳            👛

┌─────┐      ┌──────┐      ┌─────┐      ┌─────┐
│Cash │      │Mobile│      │Visa │      │Pay  │
│  💰 │      │Money │      │Card │      │Wal  │
└─────┘      │  📱  │      │ 💳  │      └─────┘
             └──────┘      └─────┘
```

## Status Badges

```
Command Status Indicators:

✓ PAID                    ⏳ PARTIAL              ⭕ PENDING
(Command fully settled)   (Some amount paid)     (Awaiting payment)

├─ Green badge           ├─ Blue badge          ├─ Gray badge
├─ Invoice: PAID ✓       ├─ Invoice: PARTIAL    ├─ Invoice: PARTIAL
├─ Order: CONFIRMED      ├─ Order: PENDING      ├─ Order: PENDING
└─ Ready to collect      └─ Awaiting payment    └─ No payment yet


Payment Breakdown Display:

Total Amount:        50,000
  ├─ Paid:          +30,000  ✓ (Advance)
  ├─ + Later:       +20,000  ⌛ (Pending)
  └─ Balance:            0   ✓ Settled

Total Amount:        100,000
  ├─ Paid:          +50,000  ✓ (Advance)
  ├─ + Due:         +50,000  ⏳ (Final)
  └─ Balance:        50,000  ⌛ Awaiting
```

## Button States

```
CREATE COMMAND Button:

Default (items in cart):
  [📦 Create Command]
  Enabled, clickable

Processing:
  [📦 Creating...]
  Disabled, spinner

Success:
  [✓ Created!]
  Briefly shown, then dialog closes

Error:
  Shows error toast below


SETTLE COMMAND Button:

Default:
  [✓ Record Payment]
  Green button

Processing:
  [⟳ Processing...]
  Disabled, spinner

Success:
  Toast: "Command payment settled!"
  Dialog closes


Validation States:

❌ Final Amount > Remaining Due
   Shows: "Final payment exceeds remaining due"
   Button: Disabled

✓ Final Amount ≤ Remaining Due
  Shows: "Full balance will be settled"
  Button: Enabled
```

## Invoice Display Timeline

```
INVOICE STATUS OVER TIME

Created:        Advance Paid:    Settled:
time ──────► 50%         ──────► 100%

┌──────────┐      ┌──────────┐      ┌──────────┐
│ PARTIAL  │      │ PARTIAL  │      │ PAID ✓   │
│ Invoice  │      │ Invoice  │      │ Invoice  │
│ Status   │      │ Status   │      │ Status   │
│ (0% → %%)│ ──► │ (50%)    │ ──► │ (100%)   │
└──────────┘      └──────────┘      └──────────┘
   Day 1             Day 1              Day 3
(Order Created)  (Advance Recorded) (Payment Settled)
```

---

**Visual Guide Complete**
Use these diagrams to understand the feature flow at a glance.
