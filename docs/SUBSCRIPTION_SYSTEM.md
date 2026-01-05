# Subscription Management System

## Overview
The Subscription Management System allows Super Admins to manage subscription plans and business subscriptions. It supports various subscription statuses, including a special "Bought" status for lifetime access.

## Database Schema

### `subscription_plans`
Stores available subscription plans.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary Key |
| `name` | text | Plan name (e.g., Monthly, Annual) |
| `description` | text | Plan description |
| `price` | numeric(10, 2) | Cost of the plan |
| `duration_days` | integer | Duration in days |
| `features` | jsonb | Array of feature strings |
| `is_active` | boolean | Whether the plan is available for new subscriptions |
| `deleted_at` | timestamp | Soft delete timestamp |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### `subscription_statuses`
Tracks the current subscription status of each business.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary Key |
| `business_id` | uuid | Foreign Key to `businesses` |
| `plan_id` | uuid | Foreign Key to `subscription_plans` |
| `status` | text | Enum: 'Active', 'Expired', 'Cancelled', 'Pending', 'Suspended', 'Bought' |
| `start_date` | timestamp | Subscription start date |
| `end_date` | timestamp | Subscription end date (nullable for lifetime) |
| `deleted_at` | timestamp | Soft delete timestamp |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

## Business Logic

### "Bought" Status
When a business is assigned the "Bought" status:
- It is considered a "Lifetime" purchase.
- **UI Hiding:** All subscription-related UI elements (e.g., "Subscription Status" card, "Expiring Soon" alerts, Plan badges) are hidden from the Tenant Dashboard and Sidebar.
- **Login Page:** Subscription plan badges are hidden.
- **Expiration:** The system treats the subscription as never expiring (or having a very distant expiration date).

### Soft Delete
- Plans and Statuses support soft deletion via the `deleted_at` column.
- The UI filters out soft-deleted items by default.

## API & Security

### Row Level Security (RLS)
- **`subscription_plans`**:
  - `SELECT`: Public (for active plans).
  - `ALL`: Super Admin only.
- **`subscription_statuses`**:
  - `SELECT`: Business Owners (own business only) and Super Admins.
  - `ALL`: Super Admin only.

### Rate Limiting
- API endpoints are protected by Supabase's built-in rate limiting.

## Admin User Guide

### Managing Plans
1. Navigate to Super Admin > Subscription Management.
2. Click on the "Plans" tab.
3. Click "Create New Plan" to add a plan.
4. Click "Edit" or "Delete" on existing plans.

### Managing Subscriptions
1. Navigate to Super Admin > Subscription Management.
2. Click on the "Subscriptions" tab.
3. Use the "Actions" button to edit a business's subscription.
4. Set status to "Bought" to grant lifetime access and hide subscription UI for that business.

## Testing
- Unit tests are located in `src/components/super-admin/SubscriptionManagement.test.tsx` and `src/pages/TenantDashboard.test.tsx`.
- Run tests using `npm test`.
