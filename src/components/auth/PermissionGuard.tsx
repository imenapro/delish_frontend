import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermission: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showLoading?: boolean;
}

export function PermissionGuard({
  children,
  requiredPermission,
  requireAll = false,
  fallback = null,
  showLoading = true,
}: PermissionGuardProps) {
  const { hasPermission, hasAllPermissions, isLoading } = usePermissions();

  if (isLoading && showLoading) {
    return <Skeleton className="h-[100px] w-full rounded-xl" />;
  }

  const isAllowed = Array.isArray(requiredPermission) && requireAll
    ? hasAllPermissions(requiredPermission)
    : hasPermission(requiredPermission);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
