import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SuperAdmin from './SuperAdmin';
import { AuthProvider } from '@/hooks/useAuth';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [
            {
              id: '1',
              name: 'Test Bakery',
              slug: 'test-bakery',
              plan_type: 'monthly',
              status: 'active',
              subscription_start_date: '2024-01-01',
              subscription_end_date: '2024-02-01',
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: {}, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    }))
  }
}));

// Mock useAuth
const mockSignOut = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-user', email: 'admin@example.com' },
    roles: [{ role: 'super_admin' }],
    loading: false,
    signOut: mockSignOut
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock Toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('SuperAdmin Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard and fetches stores', async () => {
    render(
      <BrowserRouter>
        <SuperAdmin />
      </BrowserRouter>
    );

    // Check Header
    expect(screen.getByText('Super Admin Dashboard')).toBeDefined();

    // Check Tabs
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Businesses')).toBeDefined();
    expect(screen.getByText('Subscriptions')).toBeDefined();
    expect(screen.getByText('Analytics')).toBeDefined();
    expect(screen.getByText('Users')).toBeDefined();

    // Wait for data to load (Overview tab is default)
    await waitFor(() => {
        // MetricsCards should show data
        expect(screen.getByText('Total Stores')).toBeDefined();
    });
  });

  it('navigates to Businesses tab and shows store list', async () => {
    render(
      <BrowserRouter>
        <SuperAdmin />
      </BrowserRouter>
    );

    const businessesTab = screen.getByText('Businesses');
    fireEvent.click(businessesTab);

    await waitFor(() => {
      expect(screen.getByText('Test Bakery')).toBeDefined();
      expect(screen.getByText('monthly')).toBeDefined();
    });
  });

  it('navigates to Subscriptions tab', async () => {
    render(
      <BrowserRouter>
        <SuperAdmin />
      </BrowserRouter>
    );

    const subTab = screen.getByText('Subscriptions');
    fireEvent.click(subTab);

    await waitFor(() => {
        // SubscriptionManagement component
        expect(screen.getByText('Estimated MRR')).toBeDefined();
    });
  });

  it('navigates to Analytics tab', async () => {
    render(
        <BrowserRouter>
          <SuperAdmin />
        </BrowserRouter>
      );
  
      const analyticsTab = screen.getByText('Analytics');
      fireEvent.click(analyticsTab);
  
      await waitFor(() => {
          // AnalyticsDashboard component
          expect(screen.getByText('Business Growth')).toBeDefined();
      });
  });

  it('navigates to Users tab', async () => {
    render(
        <BrowserRouter>
          <SuperAdmin />
        </BrowserRouter>
      );
  
      const usersTab = screen.getByText('Users');
      fireEvent.click(usersTab);
  
      await waitFor(() => {
          // UserManagement component
          expect(screen.getByText('User Management')).toBeDefined();
      });
  });
});
