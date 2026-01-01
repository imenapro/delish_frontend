# Card Payment Setup & Configuration Guide

## Overview
This document outlines the setup requirements and configuration checklist for enabling card payments in the POS system. The current implementation supports Visa and Mastercard, with simulated processing for testing and development.

## 1. System Requirements

### Hardware
- **Card Reader**: Compatible magnetic stripe or EMV chip reader (if integrating with physical hardware in the future).
- **Network**: Stable internet connection for payment gateway communication.

### Software
- **SSL Certificate**: HTTPS is mandatory for any environment handling card data to ensure PCI-DSS compliance.
- **Browser**: Modern web browser (Chrome, Firefox, Edge, Safari) with JavaScript enabled.

## 2. Configuration Checklist

Before activating card payments in a production environment, ensure the following steps are completed:

- [ ] **Merchant Account Setup**
    - Obtain Merchant ID (MID) and Terminal ID (TID) from your payment processor.
    - Configure API keys (Public/Private) in the backend environment variables.

- [ ] **Security Compliance (PCI-DSS)**
    - [ ] Ensure the application is served over HTTPS.
    - [ ] Verify that no raw card data is logged to the server console or database.
    - [ ] Enable Tokenization: Ensure the backend replaces sensitive card data with a token before storage.

- [ ] **Payment Gateway Integration**
    - Current implementation uses a **simulation** mode.
    - For production, replace the `handleCardSubmit` simulation in `POSPaymentDialog.tsx` with an actual API call to your payment provider (e.g., Stripe, PayPal, Square).

## 3. Testing Guide

Use the following test scenarios to verify the implementation:

### Valid Cards (Simulated Success)
- **Visa**: Any 16-digit number starting with `4`.
- **Mastercard**: Any 16-digit number starting with `51-55` or `22-27`.
- **Result**: Should show "Payment Successful" and a Transaction ID.

### Declined Cards (Simulated Failure)
- **Scenario**: Insufficient Funds / Declined by Issuer.
- **Test Data**: Use any valid card number format ending in `0000`.
- **Result**: Should show "Transaction Declined" error message.

### Validation Errors
- **Expired Card**: Enter a past date in MM/YY.
- **Invalid Number**: Enter fewer than 16 digits (or 15 for Amex).
- **Invalid CVV**: Enter fewer than 3 digits.

## 4. Troubleshooting

| Issue | Possible Cause | Resolution |
|-------|----------------|------------|
| "Invalid or unsupported card type" | Card number pattern does not match Visa/Mastercard/Amex/Discover. | Check the number and ensure it starts with the correct digits (e.g., 4 for Visa). |
| "Transaction Declined" | Simulated decline triggered. | Do not use a card number ending in `0000` for success tests. |
| Submit button disabled | Form validation failed. | Ensure all fields (Number, Expiry, CVV, Name) are valid and green. |

## 5. Future Enhancements
- **Physical Terminal Integration**: Connect to hardware terminals via WebSocket or local API.
- **Receipt Printing**: Include authorization codes on printed receipts.
- **Refunds**: Implement card refund logic in the transaction history.
