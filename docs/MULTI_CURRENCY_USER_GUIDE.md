# Multi-Currency System - Admin Guide

## Overview
BakeSync supports multiple currencies to serve businesses in different regions. As a Super Admin or Tenant Admin, you can configure and manage how currency is displayed and used in your store.

## for Super Admins

### Managing Global Currencies
Super Admins can define which currencies are available in the system.

1.  **Navigate to**: Super Admin Dashboard -> Currency Management.
2.  **Add New Mapping**:
    -   Click "Add Mapping".
    -   Select Country (e.g., Rwanda).
    -   Enter Currency Code (e.g., RWF).
    -   Enter Symbol (e.g., FRW).
    -   Enter Locale (e.g., en-RW).
3.  **Active Status**: Toggle `Active` to enable or disable a currency for new businesses.

### Exchange Rates (Future Feature)
The system supports storing exchange rates in the `currency_rates` table. Currently, this is used for reference, but future updates may enable multi-currency payments.

## for Tenant Admins (Business Owners)

### Setting Your Store Currency
Your store's currency is typically set during the onboarding process based on your country selection.

To view or change your currency:
1.  **Navigate to**: Settings -> General.
2.  **Currency Field**: View your current currency setting (e.g., USD, RWF).
    -   *Note*: If you need to change this after setup, please contact support to ensure historical data integrity.

### How it Works
-   **Dashboard**: All sales and revenue figures will appear in your selected currency.
-   **POS**: Prices, cart totals, and receipts will use your currency symbol.
-   **Invoices**: All generated invoices (PDF and Web) will reflect your currency.
-   **Reports**: Shift reports and financial summaries will automatically format amounts (e.g., `RWF 5,000` or `$50.00`).

## Troubleshooting

### "My currency symbol is wrong"
-   Check your store settings.
-   If the symbol is generic (e.g., just the code "KES" instead of "KSh"), it might be a locale configuration issue. Contact support to update the system locale mapping.

### "I see 'USD' instead of my currency"
-   This indicates the system could not load your specific currency preference and fell back to the default (USD).
-   Refresh the page. If the issue persists, ensure your business profile is correctly configured in the database.

### "Blank Page on POS"
-   If you see a blank page, it might be a loading issue. The system now includes a "Retry" button. Click it to reload your store data.
