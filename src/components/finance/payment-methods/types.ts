
export type PaymentMethodType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'mobile_money' | 'bank_transfer' | 'paypal';

export interface PaymentMethodBase {
  id: string;
  type: PaymentMethodType;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardConfig extends PaymentMethodBase {
  type: 'visa' | 'mastercard' | 'amex' | 'discover';
  config: {
    cardholder_name: string;
    last_four: string;
    expiry_month: string;
    expiry_year: string;
    // In a real app, we'd store a token here, not the full PAN/CVV
    token_id?: string;
    encrypted_data?: string; // For simulation
    fingerprint?: string; // For duplicate detection (hash of card number + expiry)
  };
}

export interface MobileMoneyConfig extends PaymentMethodBase {
  type: 'mobile_money';
  config: {
    provider: string;
    account_type: 'phone_number' | 'merchant_code';
    phone_number?: string;
    merchant_code?: string;
    merchant_id?: string;
  };
}

export interface BankConfig extends PaymentMethodBase {
  type: 'bank_transfer';
  config: {
    bank_name: string;
    account_number: string;
    account_name: string;
    branch_code?: string;
    swift_code?: string;
    iban?: string;
  };
}

export interface PaypalConfig extends PaymentMethodBase {
  type: 'paypal';
  config: {
    email: string;
    merchant_id?: string;
  };
}

export type PaymentMethodConfig = CardConfig | MobileMoneyConfig | BankConfig | PaypalConfig;

export interface PaymentMethodsState {
  methods: PaymentMethodConfig[];
}
