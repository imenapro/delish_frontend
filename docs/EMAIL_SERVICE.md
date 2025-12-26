# Email Service Documentation

## Overview
The BakeSync Email Service is a robust, multi-tenant email delivery system built on Supabase Edge Functions. It supports:
- **Default System Email:** Uses a central Gmail account for system notifications (e.g., account creation).
- **Tenant-Specific Email:** Allows business tenants to configure their own SMTP servers (e.g., SendGrid, Mailgun, or their own Gmail) for customer-facing emails.
- **Failover Logic:** Automatically falls back to system email if tenant configuration fails.
- **Rate Limiting:** Enforces limits (100 emails/hour) per tenant to prevent abuse.
- **Logging:** Tracks all email attempts (success/failure) in the database.

## Architecture
- **Backend:** Supabase Edge Function (`send-email`) running Deno.
- **Frontend:** React Admin UI (`TenantEmailSettings.tsx`) for configuration and testing.
- **Database:** 
  - `tenant_email_settings`: Stores encrypted SMTP credentials per business.
  - `email_logs`: Stores history of sent emails.
- **Security:** 
  - Credentials stored in Supabase Secrets (Env Vars) and RLS-protected tables.
  - CORS policies restrict access to authorized domains.

## Configuration

### 1. System-Wide Configuration (Environment Variables)
These secrets must be set in the Supabase Dashboard > Edge Functions > Secrets:

| Variable Name | Description | Example Value |
|Str |Str |Str |
| `GMAIL_USER` | Default sender address | `imenabrain@gmail.com` |
| `GMAIL_PASS` | Google App Password | `xsbc xqpe bsin remy` |
| `SUPABASE_URL` | Project API URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API Key | `eyJ...` (Full Service Role Key) |

### 2. Tenant Configuration
Tenants can configure their own email settings via the **Settings > Email Configuration** page in their dashboard.
- **SMTP Host:** e.g., `smtp.sendgrid.net`
- **Port:** `587` (TLS) or `465` (SSL)
- **User/Pass:** Their credentials.

## Deployment
Due to network restrictions, the function is deployed manually via the Supabase Dashboard.

### Manual Deployment Steps
1. Navigate to **Supabase Dashboard > Edge Functions**.
2. Create/Edit the function named `send-email`.
3. Disable "Verify JWT" (handled internally or public for testing).
4. Paste the source code from `supabase/functions/send-email/index.ts`.
5. Save and Deploy.

## Troubleshooting

### Common Issues
1. **CORS Error / 404 Not Found:**
   - **Cause:** Function is not deployed or URL is incorrect.
   - **Fix:** Verify function exists in Dashboard and is named exactly `send-email`.

2. **Auth Error (500):**
   - **Cause:** Missing `SUPABASE_SERVICE_ROLE_KEY` secret.
   - **Fix:** Add the secret in the Dashboard.

3. **Email Not Sent (Gmail):**
   - **Cause:** 2-Step Verification not enabled or App Password invalid.
   - **Fix:** Generate a new App Password in Google Account Settings.

### Testing
- Use the **"Send Test Email"** button in the Tenant Admin UI.
- Check the **"Recent Email Logs"** table in the UI for status details.

## API Usage
**Endpoint:** `POST /functions/v1/send-email`

**Body:**
```json
{
  "to": "customer@example.com",
  "subject": "Order Receipt",
  "html": "<h1>Thank you!</h1>",
  "businessId": "uuid-of-business" // Optional: Triggers tenant config lookup
}
```
