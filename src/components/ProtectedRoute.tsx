import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'super_admin' | 'branch_manager' | 'admin' | 'seller' | 'manager' | 'delivery' | 'customer' | 'store_keeper' | 'manpower' | 'accountant' | 'store_owner';
  requiredRoles?: ('super_admin' | 'branch_manager' | 'admin' | 'seller' | 'manager' | 'delivery' | 'customer' | 'store_keeper' | 'manpower' | 'accountant' | 'store_owner')[];
}

export function ProtectedRoute({ children, requiredRole, requiredRoles }: ProtectedRouteProps) {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  const hasAccess = useCallback(() => {
    if (roles.some(r => r.role === 'super_admin')) return true;
    if (roles.some(r => r.role === 'admin')) return true;
    if (requiredRoles) {
      return roles.some(r => requiredRoles.includes(r.role));
    }
    if (requiredRole) {
      return roles.some(r => r.role === requiredRole);
    }
    return true;
  }, [roles, requiredRoles, requiredRole]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && (requiredRole || requiredRoles) && !hasAccess()) {
      navigate('/');
    }
  }, [user, roles, loading, requiredRole, requiredRoles, navigate, hasAccess]);

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

  if ((requiredRole || requiredRoles) && !hasAccess()) {
    return null;
  }

  return <>{children}</>;
}
