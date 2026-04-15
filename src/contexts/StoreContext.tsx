import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getStoreSlugFromDomain, isCustomDomain } from '@/utils/domainMapping';

export interface ThemeConfig {
  logoUrl?: string;
  bgImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  showLoginBackground: boolean;
}

export interface InvoiceSettings {
  showLogo: boolean;
  logoPosition: 'left' | 'center' | 'right';
  primaryColor: string;
  secondaryColor: string;
  showBusinessDetails: boolean;
  showCustomerDetails: boolean;
  showPaymentTerms: boolean;
  itemFormat: 'detailed' | 'condensed' | 'simple';
  footerText: string;
  fontFamily: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  bgImageUrl?: string;
  showLoginBackground: boolean;
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
  currency: string;
  invoiceTemplateId?: string;
  invoiceSettings?: InvoiceSettings;
  disableShiftOpeningCash?: boolean;
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

  const loadStore = useCallback(async () => {
    const hostname = window.location.hostname;
    const manualSlug = getStoreSlugFromDomain(hostname);
    const isCustom = isCustomDomain(hostname);
    
    // Ignore legacy routes that are not tenant routes
    const legacyRoutes = ['super-admin', 'auth', 'pos', 'shops', 'products', 'orders', 'kitchen', 'delivery', 'inventory', 'finance', 'workforce', 'reports', 'admin', 'staff-management', 'wallet', 'chat', 'register'];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase.from('businesses').select('*');
      let shouldFetch = false;
      
      if (manualSlug) {
        query = query.ilike('slug', manualSlug);
        shouldFetch = true;
      } else if (isCustom) {
        query = query.eq('custom_domain', hostname);
        shouldFetch = true;
      } else {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const slugFromPath = pathParts[0];
        
        if (slugFromPath && !legacyRoutes.includes(slugFromPath)) {
          query = query.ilike('slug', slugFromPath);
          shouldFetch = true;
        }
      }
      
      if (shouldFetch) {
        const { data: business, error } = await query.maybeSingle();
        
        if (error) {
          console.error('[StoreContext] Error loading business:', error);
          setStore(null);
        } else if (business) {
          setStore({
            id: business.id,
            name: business.name,
            slug: business.slug,
            logoUrl: business.logo_url,
            bgImageUrl: business.bg_image_url,
            showLoginBackground: business.show_login_background ?? true,
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
            currency: business.currency || 'USD',
            invoiceTemplateId: business.invoice_template_id || 'classic',
            invoiceSettings: business.invoice_settings || {
              showLogo: true,
              logoPosition: 'right',
              primaryColor: business.primary_color || '#000000',
              secondaryColor: business.secondary_color || '#ffffff',
              showBusinessDetails: true,
              showCustomerDetails: true,
              showPaymentTerms: true,
              itemFormat: 'detailed',
              footerText: 'Thank you for your business!',
              fontFamily: 'Inter'
            },
            disableShiftOpeningCash: business.disable_shift_opening_cash ?? false,
          });
        } else {
          setStore(null);
        }
      } else {
        setStore(null);
      }
    } catch (error) {
      console.error('[StoreContext] Unexpected error loading store:', error);
      setStore(null);
    }
    setLoading(false);
  }, [location.pathname]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);



  const calculateDaysUntilExpiration = (): number => {
    if (!store?.subscriptionEndDate) return 0;
    const endDate = new Date(store.subscriptionEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isExpired = store ? (store.status === 'Bought' ? false : new Date(store.subscriptionEndDate) < new Date()) : false;
  const daysUntilExpiration = store?.status === 'Bought' ? 36500 : calculateDaysUntilExpiration();

  const themeConfig: ThemeConfig = {
    logoUrl: store?.logoUrl,
    bgImageUrl: store?.bgImageUrl,
    primaryColor: store?.primaryColor || '#8B4513',
    secondaryColor: store?.secondaryColor || '#D2691E',
    showLoginBackground: store?.showLoginBackground ?? true,
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
