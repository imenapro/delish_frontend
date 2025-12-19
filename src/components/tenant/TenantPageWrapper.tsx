import { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

interface TenantPageWrapperProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function TenantPageWrapper({ title, description, children, actions }: TenantPageWrapperProps) {
  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumbs />
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
