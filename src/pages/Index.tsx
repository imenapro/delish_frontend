import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserBusinesses } from '@/hooks/useUserBusinesses';
import { getAbsoluteUrlForStore } from '@/utils/domainMapping';
import Dashboard from './Dashboard';

export default function Index() {
  const { user, loading, roles } = useAuth();
  const { data: businesses, isLoading: businessesLoading } = useUserBusinesses();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!loading && user && !businessesLoading && businesses) {
      // 1. Super Admin goes to super admin dashboard
      if (roles.some(r => r.role === 'super_admin')) {
        navigate('/super-admin');
        return;
      }

      // 2. If user has businesses, redirect to the first one's dashboard
      if (businesses.length > 0) {
        const business = businesses[0];
        if (business.slug) {
          const targetUrl = getAbsoluteUrlForStore(business.slug);
          if (targetUrl.startsWith('http')) {
            window.location.href = targetUrl;
          } else {
            navigate(targetUrl);
          }
        }
      }
    }
  }, [user, loading, navigate, businesses, businessesLoading, roles]);

  if (loading || (user && businessesLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Fallback for users with no business or super admin who escaped the redirect
  return <Dashboard />;
}
