
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaffManagement from '@/pages/StaffManagement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { UIPersistenceProvider } from '@/contexts/ui-persistence-context';

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
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
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

// Mock useQuery to return data
const mockStaff = [
  {
    id: 'staff-1',
    name: 'Staff One',
    email: 'staff1@example.com',
    roles: [{ role: 'staff', shop: { name: 'Shop A' }, shop_id: 'shop-a' }],
    created_at: new Date().toISOString(),
    is_suspended: false,
  },
  {
    id: 'staff-2',
    name: 'Staff Two',
    email: 'staff2@example.com',
    roles: [{ role: 'staff', shop: { name: 'Shop B' }, shop_id: 'shop-b' }],
    created_at: new Date().toISOString(),
    is_suspended: false,
  },
];

const mockShops = [
  { id: 'shop-a', name: 'Shop A', business_id: 'biz-1' },
  { id: 'shop-b', name: 'Shop B', business_id: 'biz-1' },
];

// Mock database responses
import { supabase } from '@/integrations/supabase/client';

describe('StaffManagement', () => {
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
    const mockEq = vi.fn();
    const mockOrder = vi.fn();
    const mockIn = vi.fn();

    // Setup chain
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'shops') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockShops, error: null }),
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
      if (table === 'profiles') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: mockStaff, error: null }),
          }),
        };
      }
      if (table === 'user_roles') {
        return {
          select: () => Promise.resolve({ 
            data: [
              { user_id: 'staff-1', role: 'staff', shop_id: 'shop-a' },
              { user_id: 'staff-2', role: 'staff', shop_id: 'shop-b' }
            ], 
            error: null 
          }),
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
            <StaffManagement />
          </MemoryRouter>
        </UIPersistenceProvider>
      </QueryClientProvider>
    );
  };

  it('renders staff list and add button', async () => {
    renderComponent();

    expect(screen.getByText('Staff Management')).toBeInTheDocument();
    expect(screen.getByText('Add Staff')).toBeInTheDocument();
    
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

    // Find checkboxes by row to be safe
    const rows = screen.getAllByRole('row');
    // rows[0] is header, rows[1] is first staff
    const firstRowCheckbox = within(rows[1]).getByRole('checkbox');

    // Select first staff
    await user.click(firstRowCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/Transfer \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Delete \(1\)/)).toBeInTheDocument();
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

    const transferBtn = await screen.findByText(/Transfer \(1\)/);
    await user.click(transferBtn);

    expect(screen.getByText('Batch Transfer Staff')).toBeInTheDocument();
    expect(screen.getByText(/Move 1 selected staff members/)).toBeInTheDocument();
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

    const deleteBtn = await screen.findByText(/Delete \(1\)/);
    await user.click(deleteBtn);

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText(/permanently delete/)).toBeInTheDocument();
  });
});
