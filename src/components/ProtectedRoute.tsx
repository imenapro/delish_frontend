import { ReactNode, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { isCustomDomain } from '@/utils/domainMapping';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredRole, requiredRoles, requiredPermission }: ProtectedRouteProps) {
  const { user, roles, loading: authLoading } = useAuth();
  const { hasPermission, isLoading: permsLoading } = usePermissions();
  const navigate = useNavigate();

  const loading = authLoading || (requiredPermission ? permsLoading : false);

  const hasAccess = useCallback(() => {
    // Super admin bypass
    if (roles.some(r => r.role === 'super_admin')) return true;
    
    // Check permission if required
    if (requiredPermission) {
      if (!hasPermission(requiredPermission)) return false;
    }

    // Check roles if required (existing logic)
    if (roles.some(r => r.role === 'admin')) return true;
    if (requiredRoles) {
      return roles.some(r => requiredRoles.includes(r.role));
    }
    if (requiredRole) {
      return roles.some(r => r.role === requiredRole);
    }
    return true;
  }, [roles, requiredRoles, requiredRole, requiredPermission, hasPermission]);

  useEffect(() => {
    if (!loading && !user) {
      // On custom domain (tenant), redirect to /login instead of /auth
      const isCustom = isCustomDomain(window.location.hostname);
      navigate(isCustom ? '/login' : '/auth');
    }
    
    if (!loading && user && (requiredRole || requiredRoles || requiredPermission) && !hasAccess()) {
      navigate('/');
    }
  }, [user, roles, loading, requiredRole, requiredRoles, requiredPermission, navigate, hasAccess]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if ((requiredRole || requiredRoles || requiredPermission) && !hasAccess()) {
    return null;
  }

  return <>{children}</>;
}
