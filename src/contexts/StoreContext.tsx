import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getStoreSlugFromDomain, isCustomDomain } from '@/utils/domainMapping';

export interface ThemeConfig {
  logoUrl?: string;
  bgImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  bgImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  slogan?: string;
  ownerEmail: string;
  planType: 'trial' | 'monthly' | 'quarterly' | 'annual';
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'suspended';
  locale: 'pt' | 'en' | 'fr';
  customDomain?: string;
}

interface StoreContextType {
  store: Store | null;
  loading: boolean;
  isExpired: boolean;
  daysUntilExpiration: number;
  themeConfig: ThemeConfig;
  setStore: (store: Store | null) => void;
  refreshStore: () => void;
  getTenantRoute: (path: string) => string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStore = async () => {
      // Check for custom domain first
      const hostname = window.location.hostname;
      const manualSlug = getStoreSlugFromDomain(hostname);
      const isCustom = isCustomDomain(hostname);
      
      console.log('[StoreContext] Loading store for hostname:', hostname);
      
      // Ignore legacy routes that are not tenant routes
      const legacyRoutes = ['super-admin', 'auth', 'pos', 'shops', 'products', 'orders', 'kitchen', 'delivery', 'inventory', 'finance', 'workforce', 'reports', 'admin', 'staff-management', 'wallet', 'chat', 'register'];
      
      try {
        // Check auth status
        const { data: { user } } = await supabase.auth.getUser();
        console.log('[StoreContext] Current user:', user?.id);

        let query = supabase.from('businesses').select('*');
        let shouldFetch = false;

        if (manualSlug) {
          // 1. Hardcoded Custom Domain
          console.log('[StoreContext] Using hardcoded slug:', manualSlug);
          query = query.ilike('slug', manualSlug);
          shouldFetch = true;
        } else if (isCustom) {
          // 2. Dynamic Custom Domain
          console.log('[StoreContext] Using dynamic custom domain:', hostname);
          // We cast to any because custom_domain might not be in the local types yet
          query = query.eq('custom_domain', hostname);
          shouldFetch = true;
        } else {
          // 3. Path-based (Main Domain / Localhost)
          const pathParts = location.pathname.split('/').filter(Boolean);
          const slugFromPath = pathParts[0]; // First segment is the slug

          if (slugFromPath && !legacyRoutes.includes(slugFromPath)) {
               console.log('[StoreContext] Using path slug:', slugFromPath);
               query = query.ilike('slug', slugFromPath);
               shouldFetch = true;
          }
        }

        if (shouldFetch) {
          const { data: business, error } = await query.maybeSingle();

          console.log('[StoreContext] Query result:', { business, error });

          if (error) {
            console.error('Error loading business:', error);
            setStore(null);
          } else if (business) {
            // Map business data to Store type
            setStore({
              id: business.id,
              name: business.name,
              slug: business.slug,
              logoUrl: business.logo_url,
              bgImageUrl: business.bg_image_url,
              primaryColor: business.primary_color || '#3B82F6',
              secondaryColor: business.secondary_color || '#10B981',
              slogan: business.slogan,
              ownerEmail: business.owner_email,
              planType: business.plan_type || 'trial',
              subscriptionStartDate: business.subscription_start_date || business.trial_start_date,
              subscriptionEndDate: business.subscription_end_date || business.trial_end_date,
              status: business.status || 'active',
              locale: business.locale || 'en',
              customDomain: business.custom_domain,
            });
          } else {
            console.warn('[StoreContext] No business found');
            setStore(null);
          }
        } else {
          setStore(null);
        }
      } catch (error) {
        console.error('Error loading store:', error);
        setStore(null);
      }
      setLoading(false);
    };

    loadStore();
  }, [location.pathname]);

  const refreshStore = () => {
    // Re-trigger effect by updating state or provide a way to call loadStore
    // For now we can just force a reload or use a counter in dependency
    // But since loadStore is now inside useEffect, we can't call it directly.
    // We can use a version state.
    setVersion(v => v + 1);
  };
  
  const [version, setVersion] = useState(0);

  // Update useEffect dependency
  useEffect(() => {
    // ... loadStore definition ...
    // loadStore();
  }, [location.pathname, version]); // Added version here but need to move code


  const calculateDaysUntilExpiration = (): number => {
    if (!store?.subscriptionEndDate) return 0;
    const endDate = new Date(store.subscriptionEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isExpired = store ? new Date(store.subscriptionEndDate) < new Date() : false;
  const daysUntilExpiration = calculateDaysUntilExpiration();

  const themeConfig: ThemeConfig = {
    logoUrl: store?.logoUrl,
    bgImageUrl: store?.bgImageUrl,
    primaryColor: store?.primaryColor || '#8B4513',
    secondaryColor: store?.secondaryColor || '#D2691E',
  };

  // Apply theme colors dynamically
  useEffect(() => {
    if (store) {
      const root = document.documentElement;
      // Convert hex to HSL for CSS variables (simplified)
      root.style.setProperty('--store-primary', store.primaryColor);
      root.style.setProperty('--store-secondary', store.secondaryColor);
    }
  }, [store]);

  const getTenantRoute = (path: string): string => {
    if (!store) return path;
    const hostname = window.location.hostname;
    if (isCustomDomain(hostname)) {
      // Ensure path starts with /
      return path.startsWith('/') ? path : `/${path}`;
    }
    return `/${store.slug}${path}`;
  };

  return (
    <StoreContext.Provider
      value={{
        store,
        loading,
        isExpired,
        daysUntilExpiration,
        themeConfig,
        setStore,
        refreshStore: loadStore,
        getTenantRoute,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStoreContext() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStoreContext must be used within a StoreProvider');
  }
  return context;
}
