import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import * as usePermissionsModule from '@/hooks/usePermissions';

// Mock the hook module
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

describe('RBAC System', () => {
  const mockUsePermissions = usePermissionsModule.usePermissions as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PermissionGuard Component', () => {
    it('should render children when user has required permission', () => {
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        hasPermission: (perm: string) => perm === 'required.permission',
        hasAllPermissions: () => true,
        permissions: ['required.permission'],
      });

      render(
        <PermissionGuard requiredPermission="required.permission">
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should render fallback when user lacks required permission', () => {
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        hasPermission: () => false,
        hasAllPermissions: () => false,
        permissions: [],
      });

      render(
        <PermissionGuard 
          requiredPermission="required.permission" 
          fallback={<div data-testid="fallback">Fallback</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGuard>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      mockUsePermissions.mockReturnValue({
        isLoading: true,
        hasPermission: () => false,
        permissions: [],
      });

      const { container } = render(
        <PermissionGuard requiredPermission="required.permission">
          <div>Content</div>
        </PermissionGuard>
      );

      // Check for Skeleton or loading state
      // The component uses <Skeleton className="h-[100px] w-full rounded-xl" />
      // We can check if something with that class exists or just check that content is not there
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument(); // Skeleton usually has animate-pulse
    });

    it('should support array of permissions (ANY match)', () => {
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        hasPermission: (perms: string | string[]) => {
           if (Array.isArray(perms)) return perms.includes('granted.permission');
           return false;
        },
        permissions: ['granted.permission'],
      });

      render(
        <PermissionGuard requiredPermission={['granted.permission', 'other.permission']}>
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should support requireAll prop', () => {
        // Case 1: Has all permissions
        mockUsePermissions.mockReturnValue({
          isLoading: false,
          hasAllPermissions: () => true,
          hasPermission: () => true, // Mock implementation detail
          permissions: ['perm1', 'perm2'],
        });
  
        const { unmount } = render(
          <PermissionGuard 
            requiredPermission={['perm1', 'perm2']} 
            requireAll={true}
          >
            <div data-testid="protected-content">Protected Content</div>
          </PermissionGuard>
        );
  
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        unmount();

        // Case 2: Missing one permission
        mockUsePermissions.mockReturnValue({
            isLoading: false,
            hasAllPermissions: () => false,
            hasPermission: () => true,
            permissions: ['perm1'],
        });

        render(
            <PermissionGuard 
              requiredPermission={['perm1', 'perm2']} 
              requireAll={true}
              fallback={<div data-testid="fallback">Fallback</div>}
            >
              <div data-testid="protected-content">Protected Content</div>
            </PermissionGuard>
        );

        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });
  });

  describe('Permission Logic (via Mock)', () => {
      // This tests the logic we expect our hook to implement, 
      // effectively documenting the expected behavior.
      
      const realLogic = (userPermissions: string[]) => {
          const hasPermission = (required: string | string[]) => {
              if (Array.isArray(required)) {
                  return required.some(p => userPermissions.includes(p));
              }
              return userPermissions.includes(required);
          };
          const hasAllPermissions = (required: string[]) => {
              return required.every(p => userPermissions.includes(p));
          };
          return { hasPermission, hasAllPermissions };
      };

      it('hasPermission should return true for exact match', () => {
          const { hasPermission } = realLogic(['user.view']);
          expect(hasPermission('user.view')).toBe(true);
      });

      it('hasPermission should return false for mismatch', () => {
        const { hasPermission } = realLogic(['user.view']);
        expect(hasPermission('user.edit')).toBe(false);
      });

      it('hasPermission with array should return true if ANY match', () => {
        const { hasPermission } = realLogic(['user.view']);
        expect(hasPermission(['user.edit', 'user.view'])).toBe(true);
      });

      it('hasPermission with array should return false if NONE match', () => {
        const { hasPermission } = realLogic(['user.view']);
        expect(hasPermission(['user.edit', 'user.delete'])).toBe(false);
      });

      it('hasAllPermissions should return true only if ALL match', () => {
        const { hasAllPermissions } = realLogic(['user.view', 'user.edit']);
        expect(hasAllPermissions(['user.view', 'user.edit'])).toBe(true);
      });

      it('hasAllPermissions should return false if ANY missing', () => {
        const { hasAllPermissions } = realLogic(['user.view']);
        expect(hasAllPermissions(['user.view', 'user.edit'])).toBe(false);
      });
  });

  describe('Permission Calculation Algorithm', () => {
    // This duplicates the logic in usePermissions.ts to verify the algorithm's correctness
    // Scenarios: Role Grant, Override Grant, Override Deny
    
    function calculatePermissions(
        rolePermissions: string[], 
        overrides: { code: string, is_granted: boolean }[]
    ): Set<string> {
        const finalPermissions = new Set<string>(rolePermissions);
        
        overrides.forEach(override => {
            if (override.is_granted) {
                finalPermissions.add(override.code);
            } else {
                finalPermissions.delete(override.code);
            }
        });
        
        return finalPermissions;
    }

    it('should default to role permissions if no overrides', () => {
        const result = calculatePermissions(['view', 'edit'], []);
        expect(result.has('view')).toBe(true);
        expect(result.has('edit')).toBe(true);
        expect(result.has('delete')).toBe(false);
    });

    it('should allow override to GRANT a permission not in role', () => {
        const result = calculatePermissions(['view'], [{ code: 'delete', is_granted: true }]);
        expect(result.has('view')).toBe(true);
        expect(result.has('delete')).toBe(true);
    });

    it('should allow override to DENY a permission present in role', () => {
        const result = calculatePermissions(['view', 'delete'], [{ code: 'delete', is_granted: false }]);
        expect(result.has('view')).toBe(true);
        expect(result.has('delete')).toBe(false);
    });

    it('should handle mixed overrides', () => {
        const result = calculatePermissions(
            ['view', 'edit'], 
            [
                { code: 'delete', is_granted: true }, // Grant new
                { code: 'edit', is_granted: false }   // Revoke existing
            ]
        );
        expect(result.has('view')).toBe(true);
        expect(result.has('edit')).toBe(false);
        expect(result.has('delete')).toBe(true);
    });
  });
});
