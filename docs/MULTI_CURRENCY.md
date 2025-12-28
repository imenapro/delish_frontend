# Multi-Currency System Documentation

## Overview
The BakeSync Multi-Currency System allows businesses to operate in their local currency. The system ensures consistent currency formatting, storage, and validation across the application.

## Features
- **Dynamic Currency Formatting**: Currencies are formatted according to their standard locale (e.g., `USD` uses `$`, `RWF` uses `RWF`, `MZN` uses `MT`).
- **Business-Level Configuration**: Each business can configure its own operating currency and language/locale.
- **Consistent Display**: POS, Reports, and Dashboards automatically adapt to the business's selected currency.
- **Data Integrity**: Database triggers ensure transactions match the store's currency.

## User Guide

### Configuring Currency
1. Log in to the Tenant Admin Dashboard (`/admin`).
2. Navigate to the **Administration** section.
3. Locate the **Regional Settings** card.
4. Select your **Currency** from the dropdown (e.g., RWF, USD, MZN).
5. Select your **Language** (optional, for UI localization).
6. Click **Save Changes**.

The application will immediately update to reflect the new currency symbol and formatting.

## Developer Guide

### Key Components

#### 1. Currency Utility (`src/utils/currency.ts`)
Use `formatCurrency` to display amounts. It automatically handles locale resolution based on the currency code.

```typescript
import { formatCurrency } from '@/utils/currency';

// Basic usage (defaults to en-US/USD if not specified)
formatCurrency(1000, 'RWF'); // Output: "RWF 1,000" (using en-RW locale)
formatCurrency(50.50, 'USD'); // Output: "$50.50"

// With explicit locale
formatCurrency(1000, 'EUR', 'de-DE'); // Output: "1.000,00 €"
```

#### 2. Store Context (`src/contexts/StoreContext.tsx`)
Access the current store's currency via the `useStoreContext` hook.

```typescript
import { useStoreContext } from '@/contexts/StoreContext';

const MyComponent = () => {
  const { store } = useStoreContext();
  
  return (
    <div>
      {formatCurrency(amount, store?.currency)}
    </div>
  );
};
```

#### 3. Currency Settings Component
The `TenantCurrencySettings` component (`src/components/tenant/TenantCurrencySettings.tsx`) handles the UI for updating business currency preferences.

### Database & Validation

To ensure data integrity, SQL triggers validate that any inserted financial record (expense, payment, payroll) matches the store's configured currency.

#### SQL Migration
Run the following SQL (found in `src/integrations/supabase/VALIDATE_CURRENCY.sql`) to enable validation triggers:

```sql
-- Creates the validation function and triggers
CREATE OR REPLACE FUNCTION validate_transaction_currency() ...
```

### Supported Currencies
The system currently supports a wide range of currencies defined in `DEFAULT_LOCALES` within `src/utils/currency.ts`. New currencies can be added by updating this mapping.

## Implementation Details

- **POS Components**: `POSCart`, `POSProductGrid`, `Receipt`, etc., have been updated to replace hardcoded 'RWF' with dynamic currency props.
- **Reports**: `Reports.tsx` and `TenantDashboard.tsx` now use `formatCurrency` with the store's currency.
- **Validation**: Server-side triggers prevent currency mismatch errors.
