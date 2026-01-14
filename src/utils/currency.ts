
export const DEFAULT_SYSTEM_CURRENCY = 'USD';

export const DEFAULT_LOCALES: Record<string, string> = {
  'USD': 'en-US',
  'EUR': 'en-IE', // Using Ireland as English-speaking Eurozone default
  'GBP': 'en-GB',
  'RWF': 'en-RW',
  'MZN': 'pt-MZ',
  'KES': 'en-KE',
  'UGX': 'en-UG',
  'TZS': 'en-TZ',
  'ZAR': 'en-ZA',
  'NGN': 'en-NG',
  'GHS': 'en-GH',
  'AED': 'en-AE',
  'INR': 'en-IN',
};

export const formatCurrency = (amount: number | string | undefined | null, currencyCode: string = DEFAULT_SYSTEM_CURRENCY, locale?: string): string => {
  // Safe default for currencyCode to ensure it's a valid string
  const safeCurrency = (currencyCode && typeof currencyCode === 'string' ? currencyCode : DEFAULT_SYSTEM_CURRENCY).trim().toUpperCase();
  
  // Normalize aliases if any exist in the future
  
  if (amount === undefined || amount === null || amount === '') {
    try {
      return new Intl.NumberFormat(locale || DEFAULT_LOCALES[safeCurrency] || 'en-US', {
        style: 'currency',
        currency: safeCurrency,
      }).format(0);
    } catch (e) {
      console.warn(`[Currency] Error formatting 0 for currency ${safeCurrency}:`, e);
      return `0.00 ${safeCurrency}`;
    }
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  try {
    const formatted = new Intl.NumberFormat(locale || DEFAULT_LOCALES[safeCurrency] || 'en-US', {
      style: 'currency',
      currency: safeCurrency,
    }).format(numAmount);

    // Special override for MZN to show MT instead of MTn if that's what's generated
    if (safeCurrency === 'MZN') {
        return formatted.replace('MTn', 'MT');
    }

    return formatted;
  } catch (e) {
    console.warn(`[Currency] Error formatting amount for currency ${safeCurrency}:`, e);
    return `${numAmount.toFixed(2)} ${safeCurrency}`;
  }
};

export const convertCurrency = (amount: number, rate: number): number => {
  return amount * rate;
};

export const getCurrencySymbol = (currencyCode: string, locale?: string): string => {
  const safeCurrency = (currencyCode && typeof currencyCode === 'string' ? currencyCode : DEFAULT_SYSTEM_CURRENCY).trim().toUpperCase();
  
  // Normalize aliases if any exist in the future
  
  // Special override for MZN to show MT
  if (safeCurrency === 'MZN') {
      return 'MT';
  }

  try {
    const effectiveLocale = locale || DEFAULT_LOCALES[safeCurrency] || 'en-US';
    const formatter = new Intl.NumberFormat(effectiveLocale, {
      style: 'currency',
      currency: safeCurrency,
      currencyDisplay: 'symbol',
    });
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find(part => part.type === 'currency');
    return symbolPart ? symbolPart.value : safeCurrency;
  } catch (error) {
    return safeCurrency;
  }
};
