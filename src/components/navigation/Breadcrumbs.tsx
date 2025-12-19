import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  pos: 'Point of Sale',
  shops: 'Shops',
  products: 'Products',
  orders: 'Orders',
  kitchen: 'Kitchen',
  inventory: 'Inventory',
  finance: 'Finance',
  workforce: 'Workforce',
  reports: 'Reports',
  delivery: 'Delivery',
  staff: 'Staff Management',
  admin: 'Administration',
  chat: 'Chat',
  wallet: 'Wallet',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // First segment is store slug, rest are route paths
  const storeSlug = pathSegments[0];
  const routeSegments = pathSegments.slice(1);

  if (routeSegments.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={`/${storeSlug}/dashboard`} className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {routeSegments.map((segment, index) => {
          const isLast = index === routeSegments.length - 1;
          const path = `/${storeSlug}/${routeSegments.slice(0, index + 1).join('/')}`;
          const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <div key={segment} className="flex items-center">
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
