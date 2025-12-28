# Multi-Currency Implementation Guide

## Overview
The BakeSync Multi-Currency System enables the application to support different currencies for different businesses/tenants. This allows the platform to operate in multiple regions (e.g., Rwanda, Kenya, USA) while maintaining consistent financial reporting and user experience.

## Core Components

### 1. Database Schema
- **Businesses Table**: Added `currency` column (text, default 'RWF').
- **Country Currency Mapping**: New table `country_currency_mapping` to map country codes to currency codes and locales.
- **Currency Rates**: New table `currency_rates` for exchange rates (if needed for future cross-currency reporting).

### 2. Frontend Utilities
- **`src/utils/currency.ts`**:
  - `formatCurrency(amount, currencyCode, locale)`: Main utility for formatting amounts. Handles `null`/`undefined` safely and falls back to `DEFAULT_SYSTEM_CURRENCY` ('USD').
  - `DEFAULT_SYSTEM_CURRENCY`: Constant set to 'USD'.
  - `DEFAULT_LOCALES`: Mapping of currency codes to locales (e.g., 'RWF' -> 'en-RW', 'USD' -> 'en-US').

### 3. State Management
- **`StoreContext`**: Provides the current `store` (business) context, including the `currency` setting.
- **Usage**: Components consume `useStoreContext()` to get the active currency.

## Implementation Details

### Dynamic Currency Display
All financial amounts in the application now use `formatCurrency`.
**Pattern:**
```typescript
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { useStoreContext } from '@/contexts/StoreContext';

// Inside component
const { store } = useStoreContext();
const currency = store?.currency || DEFAULT_SYSTEM_CURRENCY;

// In JSX
<span>{formatCurrency(amount, currency)}</span>
```

### Components Updated
- **POS**: `POS.tsx`, `POSCart.tsx`, `POSProductGrid.tsx`, `POSPostSaleDialog.tsx`
- **Invoices**: `PublicInvoice.tsx`, `TenantInvoiceManagement.tsx`, `ViewInvoiceDialog.tsx`, `ShareInvoiceDialog.tsx`
- **Reports**: `ViewShiftReportDialog.tsx`, `Reports.tsx`
- **Finance**: `TenantWallet.tsx`, `TenantFinance.tsx`
- **PDF Generation**: `pdfGenerator.ts`, `generateInvoicePDF.ts`

### PDF Reports
PDF generation uses `jspdf` and `jspdf-autotable`. The currency symbol is explicitly passed to the generator functions to ensure consistent formatting in printed documents.

## Testing

### Verification Steps
1.  **Dashboard**: Verify that sales figures display the correct currency symbol.
2.  **POS**: Add items to cart; verify prices and totals use the store's currency.
3.  **Invoices**: Generate an invoice; verify the PDF and web view show the correct currency.
4.  **Reports**: Open a shift report; verify opening/closing cash and sales totals.
5.  **Settings**: Change the business currency (if admin interface allows) and verify reflection across the app.

### Common Issues & Troubleshooting
-   **Blank Pages**: Usually caused by `formatCurrency` receiving invalid input (like an object instead of a number) or missing imports.
-   **"RWF" showing up**: Check for hardcoded strings in the component. Use `grep` to find "RWF" and replace with dynamic currency.
-   **Undefined Currency**: Ensure `useStoreContext` is used and fallback to `DEFAULT_SYSTEM_CURRENCY` is present.

## API & Database
-   Ensure `businesses` table has the correct `currency` value set.
-   `currency` column is a 3-letter ISO code (e.g., 'RWF', 'USD').

## Future Improvements
-   **Multi-Currency Payments**: Support accepting payments in a different currency than the store's base currency using `currency_rates`.
-   **Exchange Rate Feeds**: Automate rate updates.
