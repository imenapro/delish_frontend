import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TenantDashboard from './TenantDashboard';
import { BrowserRouter } from 'react-router-dom';

// Mock hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseStoreContext = vi.fn();
vi.mock('@/contexts/StoreContext', () => ({
  useStoreContext: () => mockUseStoreContext(),
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseShopMetrics = vi.fn();
vi.mock('@/hooks/useShopMetrics', () => ({
  useShopMetrics: () => mockUseShopMetrics(),
}));

// Mock child components to simplify testing
vi.mock('@/components/dashboard/QuickActions', () => ({
  QuickActions: () => <div data-testid="quick-actions">Quick Actions</div>,
}));

vi.mock('@/components/navigation/Breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs">Breadcrumbs</div>,
}));

vi.mock('@/components/tenant/ThemeCustomizer', () => ({
  ThemeCustomizer: () => <div data-testid="theme-customizer">Theme Customizer</div>,
}));

describe('TenantDashboard', () => {
  const defaultStore = {
    id: 'store-123',
    name: 'Test Store',
    slug: 'test-store',
    currency: 'USD',
    locale: 'en',
    status: 'active',
    planType: 'basic',
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2024-02-01',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
  };

  const defaultUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: defaultUser,
      loading: false,
    });

    mockUseShopMetrics.mockReturnValue({
      data: {
        totalProducts: 10,
        totalWorkers: 5,
        totalOrders: 20,
        monthlyRevenue: 1000,
        todayRevenue: 100,
      },
      isLoading: false,
    });
  });

  it('renders loading state', () => {
    mockUseStoreContext.mockReturnValue({
      store: defaultStore,
      loading: true,
    });

    const { container } = render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    );

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('redirects to login if user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });
    mockUseStoreContext.mockReturnValue({
      store: defaultStore,
      loading: false,
      getTenantRoute: (path: string) => `/tenant${path}`,
    });

    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/tenant/login');
  });

  it('renders dashboard content for authenticated user', () => {
    mockUseStoreContext.mockReturnValue({
      store: defaultStore,
      loading: false,
      daysUntilExpiration: 30,
      isExpired: false,
    });

    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back to Test Store')).toBeInTheDocument();
    expect(screen.getByText('Subscription Status')).toBeInTheDocument();
  });

  it('shows subscription status card for normal active subscription', () => {
    mockUseStoreContext.mockReturnValue({
      store: { ...defaultStore, status: 'active' },
      loading: false,
      daysUntilExpiration: 30,
      isExpired: false,
    });

    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Subscription Status')).toBeInTheDocument();
    expect(screen.getByText('30 days left')).toBeInTheDocument();
  });

  it('hides subscription status card for "Bought" status', () => {
    mockUseStoreContext.mockReturnValue({
      store: { ...defaultStore, status: 'Bought' },
      loading: false,
      daysUntilExpiration: 9999,
      isExpired: false,
    });

    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    );

    expect(screen.queryByText('Subscription Status')).not.toBeInTheDocument();
  });
});
