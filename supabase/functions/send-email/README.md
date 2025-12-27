# Send Email Function

This Supabase Edge Function provides a secure way to send emails using SMTP (Gmail) with fallback support.

## Configuration

To use this function, you must set the following secrets in your Supabase project:

### Primary (Gmail)
- `GMAIL_USER`: Your Gmail address (e.g., `imenabrain@gmail.com`)
- `GMAIL_PASS`: Your Gmail App Password (NOT your login password).
  - *Note: Generate an App Password in your Google Account settings under Security > 2-Step Verification > App Passwords.*

### Fallback (Optional)
If you want to use a fallback service (like SendGrid, Mailtrap, or Mailgun) in case Gmail fails:
- `FALLBACK_SMTP_HOST`: e.g., `smtp.sendgrid.net`
- `FALLBACK_SMTP_PORT`: e.g., `587`
- `FALLBACK_SMTP_USER`: Service username
- `FALLBACK_SMTP_PASS`: Service password

## Usage

Invoke the function via the Supabase client or a direct POST request.

### Parameters
- `to`: Recipient email (string or array of strings)
- `subject`: Email subject
- `html`: HTML content of the email
- `text`: (Optional) Plain text version
- `attachments`: (Optional) Array of attachments

### Example (Frontend)

```typescript
import { supabase } from "@/integrations/supabase/client";

const sendEmail = async () => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: "customer@example.com",
      subject: "Order Confirmation",
      html: "<h1>Thank you for your order!</h1><p>...</p>"
    }
  });

  if (error) {
    console.error("Failed to send:", error);
  } else {
    console.log("Email sent:", data);
  }
};
```

## Security & Error Handling

- **Credentials**: Never stored in code. Accessed via `Deno.env.get()`.
- **Fallbacks**: If the primary provider fails (connection timeout, auth error), the function automatically attempts the fallback provider.
- **CORS**: Configured to allow requests from your application.

## Troubleshooting

1. **Authentication Failed**:
   - Check if `GMAIL_PASS` is a valid App Password.
   - Ensure 2-Step Verification is enabled on the Gmail account.
2. **Connection Timeout**:
   - Verify port settings (465 for SSL, 587 for TLS).
   - Check if the server IP is blocked by the provider.
3. **Rate Limiting**:
   - Gmail has sending limits (approx. 500/day for free accounts). Use a dedicated transactional email service for high volume.

