
export const DEFAULT_SYSTEM_CURRENCY = 'USD';

export const DEFAULT_LOCALES: Record<string, string> = {
  'USD': 'en-US',
  'EUR': 'en-IE', // Using Ireland as English-speaking Eurozone default
  'GBP': 'en-GB',
  'RWF': 'en-RW',
  'MZN': 'pt-MZ',
  'MTN': 'pt-MZ', // Alias for MZN
  'KES': 'en-KE',
  'UGX': 'en-UG',
  'TZS': 'en-TZ',
  'ZAR': 'en-ZA',
  'NGN': 'en-NG',
  'GHS': 'en-GH',
  'AED': 'en-AE',
  'INR': 'en-IN',
};

export const formatCurrency = (amount: number | string | undefined | null, currencyCode: string = 'USD', locale?: string): string => {
  // Safe default for currencyCode to ensure it's a valid string
  let safeCurrency = (currencyCode && typeof currencyCode === 'string' ? currencyCode : 'USD').trim().toUpperCase();
  
  // Normalize aliases (e.g. MTn -> MZN)
  if (safeCurrency === 'MTN' || safeCurrency === 'MT') {
      safeCurrency = 'MZN';
  }
  
  // Safe conversion of amount
  let numericAmount = 0;
  try {
    numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      // Don't warn for null/undefined as those are common "loading" states
      if (amount !== null && amount !== undefined) {
        console.warn('Invalid amount passed to formatCurrency:', amount);
      }
      numericAmount = 0;
    }
  } catch (e) {
    numericAmount = 0;
  }

  try {
    const effectiveLocale = locale || DEFAULT_LOCALES[safeCurrency] || 'en-US';
    return new Intl.NumberFormat(effectiveLocale, {
      style: 'currency',
      currency: safeCurrency,
    }).format(numericAmount);
  } catch (error) {
    // Fallback if Intl fails (e.g. invalid currency code)
    // Only warn if it's likely a developer error (invalid currency code)
    if (safeCurrency.length === 3) {
        console.warn(`Error formatting currency (${safeCurrency}):`, error);
    }
    return `${safeCurrency} ${numericAmount.toFixed(2)}`;
  }
};

export const convertCurrency = (amount: number, rate: number): number => {
  return amount * rate;
};

export const getCurrencySymbol = (currencyCode: string, locale?: string): string => {
  let safeCurrency = (currencyCode && typeof currencyCode === 'string' ? currencyCode : 'USD').trim().toUpperCase();
  
  // Normalize aliases (e.g. MTn -> MZN)
  if (safeCurrency === 'MTN' || safeCurrency === 'MT') {
      safeCurrency = 'MZN';
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
