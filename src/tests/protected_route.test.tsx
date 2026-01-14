import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as useAuthModule from '@/hooks/useAuth';
import * as usePermissionsModule from '@/hooks/usePermissions';

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

// Mock Navigate
const mockedUsedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedUsedNavigate,
  };
});

describe('ProtectedRoute Component', () => {
  const mockUseAuth = useAuthModule.useAuth as unknown as ReturnType<typeof vi.fn>;
  const mockUsePermissions = usePermissionsModule.usePermissions as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockUseAuth.mockReturnValue({
      user: { id: 'user1' },
      roles: [{ role: 'staff' }],
      loading: false,
    });

    mockUsePermissions.mockReturnValue({
      hasPermission: () => false,
      isLoading: false,
    });
  });

  it('should render children if no requirements are set', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="child">Child</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should render children if role matches requiredRole', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user1' },
      roles: [{ role: 'manager' }],
      loading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="manager">
          <div data-testid="child">Child</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should NOT render children if role does not match requiredRole', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user1' },
      roles: [{ role: 'staff' }],
      loading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="manager">
          <div data-testid="child">Child</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(mockedUsedNavigate).toHaveBeenCalledWith('/');
  });

  it('should render children if user has required permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: (perm: string) => perm === 'staff.view',
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredPermission="staff.view">
          <div data-testid="child">Child</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should NOT render children if user lacks required permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: () => false,
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredPermission="staff.view">
          <div data-testid="child">Child</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(mockedUsedNavigate).toHaveBeenCalledWith('/');
  });

  it('should bypass permission check for super_admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin1' },
      roles: [{ role: 'super_admin' }],
      loading: false,
    });
    
    // Even if permission returns false
    mockUsePermissions.mockReturnValue({
      hasPermission: () => false,
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredPermission="staff.view">
          <div data-testid="child">Child</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
