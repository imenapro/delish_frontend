-- Add invoice customization settings to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS invoice_template_id TEXT DEFAULT 'classic',
ADD COLUMN IF NOT EXISTS invoice_settings JSONB DEFAULT '{
  "showLogo": true,
  "logoPosition": "right",
  "primaryColor": "#000000",
  "secondaryColor": "#ffffff",
  "showBusinessDetails": true,
  "showCustomerDetails": true,
  "showPaymentTerms": true,
  "itemFormat": "detailed",
  "footerText": "Thank you for your business!",
  "fontFamily": "Inter"
}'::jsonb;
