
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TenantStaff from '@/pages/tenant/TenantStaff';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { UIPersistenceProvider } from '@/contexts/ui-persistence-context';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-id', email: 'admin@example.com' },
    roles: [{ role: 'super_admin' }],
    signOut: vi.fn(),
  }),
}));

// Mock useToast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock StoreContext
vi.mock('@/contexts/StoreContext', () => ({
  useStoreContext: () => ({
    store: {
      id: 'store-123',
      name: 'Test Store',
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
    },
    themeConfig: {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
    },
    loading: false,
    isExpired: false,
    getTenantRoute: (path: string) => path,
  }),
  StoreProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock TenantPageWrapper
vi.mock('@/components/tenant/TenantPageWrapper', () => ({
  TenantPageWrapper: ({ children, title, actions }: any) => (
    <div>
      <h1>{title}</h1>
      <div>{actions}</div>
      {children}
    </div>
  ),
}));

const mockStaff = [
  {
    id: 'staff-1',
    name: 'Staff One',
    phone: '1234567890',
    avatar_url: null,
    is_suspended: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'staff-2',
    name: 'Staff Two',
    phone: '0987654321',
    avatar_url: null,
    is_suspended: false,
    created_at: new Date().toISOString(),
  },
];

const mockUserRoles = [
  { user_id: 'staff-1', role: 'staff', shop_id: 'shop-a', business_id: 'store-123' },
  { user_id: 'staff-2', role: 'staff', shop_id: 'shop-b', business_id: 'store-123' },
];

const mockShops = [
  { id: 'shop-a', name: 'Shop A', business_id: 'store-123' },
  { id: 'shop-b', name: 'Shop B', business_id: 'store-123' },
];

describe('TenantStaff', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock Supabase calls
    const mockSelect = vi.fn();
    
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'shops') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: mockShops, error: null }),
            }),
          }),
        };
      }
      if (table === 'role_hierarchy') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [{ child_role: 'staff' }], error: null }),
          }),
        };
      }
      if (table === 'user_roles') {
        // TenantStaff queries user_roles first
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockUserRoles, error: null }),
          }),
          update: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
          delete: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockStaff, error: null }),
          }),
        };
      }
      if (table === 'user_businesses') {
        return {
           delete: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
        };
      }
      if (table === 'audit_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: mockSelect,
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UIPersistenceProvider>
          <MemoryRouter>
            <TenantStaff />
          </MemoryRouter>
        </UIPersistenceProvider>
      </QueryClientProvider>
    );
  };

  it('renders staff list', async () => {
    renderComponent();

    expect(screen.getByText('Staff Management')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Staff One')).toBeInTheDocument();
      expect(screen.getByText('Staff Two')).toBeInTheDocument();
    });
  });

  it('shows batch actions when rows are selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Staff One')).toBeInTheDocument();
    });

    // Find checkboxes
    const rows = screen.getAllByRole('row');
    // rows[0] is header, rows[1] is first staff
    const firstRowCheckbox = within(rows[1]).getByRole('checkbox');

    // Select first staff
    await user.click(firstRowCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/Transfer Selected/)).toBeInTheDocument();
      expect(screen.getByText(/Delete Selected/)).toBeInTheDocument();
    });
  });

  it('opens batch transfer dialog', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Staff One')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    const firstRowCheckbox = within(rows[1]).getByRole('checkbox');
    await user.click(firstRowCheckbox);

    const transferBtn = await screen.findByText(/Transfer Selected/);
    await user.click(transferBtn);

    expect(screen.getByText('Batch Transfer Staff')).toBeInTheDocument();
    expect(screen.getByText(/Move 1 staff members/)).toBeInTheDocument();
  });

  it('opens batch delete dialog', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Staff One')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    const firstRowCheckbox = within(rows[1]).getByRole('checkbox');
    await user.click(firstRowCheckbox);

    const deleteBtn = await screen.findByText(/Delete Selected/);
    await user.click(deleteBtn);

    expect(screen.getByText('Remove Selected Staff?')).toBeInTheDocument();
    expect(screen.getByText(/remove 1 staff members/)).toBeInTheDocument();
  });
});
