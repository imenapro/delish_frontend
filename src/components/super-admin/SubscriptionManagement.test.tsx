import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubscriptionManagement } from './SubscriptionManagement';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockStores = [
  {
    id: 'store-1',
    name: 'Test Store 1',
    status: 'active',
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2024-02-01',
    planType: 'basic'
  },
  {
    id: 'store-2',
    name: 'Test Store 2',
    status: 'expired',
    subscriptionStartDate: '2023-01-01',
    subscriptionEndDate: '2023-02-01',
    planType: 'premium'
  }
];

const mockPlans = [
  {
    id: 'plan-1',
    name: 'Basic Plan',
    price: 10,
    duration_days: 30,
    description: 'Basic features',
    features: ['Feature 1'],
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 'plan-2',
    name: 'Premium Plan',
    price: 20,
    duration_days: 30,
    description: 'Premium features',
    features: ['Feature 1', 'Feature 2'],
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

const mockSubscriptions = [
  {
    id: 'sub-1',
    business_id: 'store-1',
    plan_id: 'plan-1',
    status: 'Active',
    start_date: '2024-01-01',
    end_date: '2024-02-01',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 'sub-2',
    business_id: 'store-2',
    plan_id: 'plan-2',
    status: 'Expired',
    start_date: '2023-01-01',
    end_date: '2023-02-01',
    created_at: '2023-01-01',
    updated_at: '2023-01-01'
  }
];

describe('SubscriptionManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementation for Supabase
    const mockSelect = vi.fn();
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'subscription_plans') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockPlans, error: null })
              })
            })
          })
        };
      }
      if (table === 'subscription_statuses') {
        return {
          select: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null })
          })
        };
      }
      return { select: mockSelect };
    });
  });

  it('renders the component and fetches data', async () => {
    render(<SubscriptionManagement stores={mockStores as any} onUpdateStore={vi.fn()} />);

    // Check if loading state or initial render happens (tabs should be visible)
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Plans')).toBeInTheDocument();

    // Wait for data to be loaded and displayed
    await waitFor(() => {
      expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      expect(screen.getByText('Basic Plan')).toBeInTheDocument(); // From plan mapping
    });
  });

  it('switches tabs correctly', async () => {
    const user = userEvent.setup();
    render(<SubscriptionManagement stores={mockStores as any} onUpdateStore={vi.fn()} />);

    const plansTab = screen.getByText('Plans');
    await user.click(plansTab);

    await waitFor(() => {
      expect(screen.getByText('Subscription Plans')).toBeInTheDocument();
      expect(screen.getByText('Create Plan')).toBeInTheDocument();
    });
    
    // Check if plans are listed
    expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    expect(screen.getByText('Premium Plan')).toBeInTheDocument();
  });

  it('opens edit dialog when clicking edit on a subscription', async () => {
    const user = userEvent.setup();
    render(<SubscriptionManagement stores={mockStores as any} onUpdateStore={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Test Store 1')).toBeInTheDocument();
    });

    // Find edit button (using lucide-react icon, might need to look for button or aria-label if added, or by icon class)
    // In the code: <Button variant="ghost" size="icon" onClick={() => handleEditClick(store)}>
    // We can assume there are buttons. Let's find by role.
    const editButtons = screen.getAllByRole('button');
    // Filter for the edit button (usually inside the table row) - checking specific one might be tricky without test id
    // But we can try to find the row first
    const row = screen.getByText('Test Store 1').closest('tr');
    const editBtn = row?.querySelector('button');
    
    expect(editBtn).toBeInTheDocument();
    if (editBtn) await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('Edit Subscription')).toBeInTheDocument();
      expect(screen.getByText('Update subscription details for Test Store 1')).toBeInTheDocument();
    });
  });

  it('opens create plan dialog', async () => {
    const user = userEvent.setup();
    render(<SubscriptionManagement stores={mockStores as any} onUpdateStore={vi.fn()} />);
    
    await user.click(screen.getByText('Plans'));

    await waitFor(() => {
      expect(screen.getByText('Create Plan')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Create Plan'));

    await waitFor(() => {
      expect(screen.getByText('Create Plan', { selector: 'h2' })).toBeInTheDocument(); // Title inside dialog
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Price')).toBeInTheDocument();
      expect(screen.getByLabelText('Duration (Days)')).toBeInTheDocument();
    });
  });
});
