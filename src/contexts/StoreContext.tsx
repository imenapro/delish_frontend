import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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
  customDomain?: string;
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
}

interface StoreContextType {
  store: Store | null;
  loading: boolean;
  isExpired: boolean;
  daysUntilExpiration: number;
  isCustomDomain: boolean;
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
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  const loadStore = async () => {
    const hostname = window.location.hostname;
    // Define platform domains where path-based routing is used
    const platformDomains = ['dev.delish.rw', 'localhost', '127.0.0.1'];
    const isPlatformDomain = platformDomains.some(d => hostname === d || hostname.endsWith('.ondigitalocean.app'));
    
    setIsCustomDomain(!isPlatformDomain);

    try {
      // Check auth status
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[StoreContext] Current user:', user?.id);

      let business = null;
      let error = null;

      if (!isPlatformDomain) {
        // Custom Domain Logic
        console.log('[StoreContext] Resolving via custom domain:', hostname);
        const result = await supabase
            .from('businesses' as any)
            .select('*')
            .eq('custom_domain', hostname)
            .maybeSingle() as any;
        business = result.data;
        error = result.error;
      } else {
        // Path-based Logic (Existing)
        const pathParts = location.pathname.split('/').filter(Boolean);
        const storeSlug = pathParts[0]; // First segment is the slug
        
        console.log('[StoreContext] Loading store for slug:', storeSlug);
        
        // Ignore legacy routes that are not tenant routes
        const legacyRoutes = ['super-admin', 'auth', 'pos', 'shops', 'products', 'orders', 'kitchen', 'delivery', 'inventory', 'finance', 'workforce', 'reports', 'admin', 'staff-management', 'wallet', 'chat', 'register', 'my-stores', 'create-first-shop', 'i'];
        
        if (storeSlug && !legacyRoutes.includes(storeSlug)) {
           const result = await supabase
            .from('businesses' as any)
            .select('*')
            .ilike('slug', storeSlug)  // Use case-insensitive match
            .maybeSingle() as any;
           business = result.data;
           error = result.error;
        }
      }

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
          customDomain: business.custom_domain,
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
        });
      } else {
        if (!isPlatformDomain) {
           console.warn('[StoreContext] No business found for custom domain:', hostname);
        }
        setStore(null);
      }
    } catch (error) {
      console.error('Error loading store:', error);
      setStore(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStore();
  }, [location.pathname]);

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
    if (isCustomDomain) return path;
    return `/${store.slug}${path}`;
  };

  return (
    <StoreContext.Provider
      value={{
        store,
        loading,
        isExpired,
        daysUntilExpiration,
        isCustomDomain,
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

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStoreContext must be used within a StoreProvider');
  }
  return context;
}
