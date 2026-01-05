export type SubscriptionStatus = 'Active' | 'Expired' | 'Cancelled' | 'Pending' | 'Suspended' | 'Bought';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  features: string[]; // JSON array in DB
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessSubscription {
  id: string;
  business_id: string;
  plan_id: string | null;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  plan?: SubscriptionPlan;
}
