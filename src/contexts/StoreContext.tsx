import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getStoreSlugFromDomain, isCustomDomain } from '@/utils/domainMapping';
import { useAuth } from '@/hooks/useAuth';

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
  status: string;
  suspendedAt?: string;
  accessReactivatedAt?: string;
  suspensionDate?: string;
  locale: 'pt' | 'en' | 'fr';
  customDomain?: string;
  currency: string;
  invoiceTemplateId?: string;
  invoiceSettings?: InvoiceSettings;
  disableShiftOpeningCash?: boolean;
  enableMoneyCollection?: boolean;
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
  const { user, loading: authLoading } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [expirationCheckTime, setExpirationCheckTime] = useState(() => Date.now());

  const loadStore = useCallback(async () => {
    const hostname = window.location.hostname;
    const manualSlug = getStoreSlugFromDomain(hostname);
    const isCustom = isCustomDomain(hostname);

    const standaloneTenantRoutes = ['warehouse', 'production-stock', 'stock-reports', 'suppliers', 'recipes', 'finished-products'];
    
    // Ignore legacy routes that are not tenant routes
    const legacyRoutes = ['super-admin', 'auth', 'pos', 'shops', 'products', 'orders', 'kitchen', 'delivery', 'inventory', 'finance', 'workforce', 'reports', 'admin', 'staff-management', 'wallet', 'chat', 'register', ...standaloneTenantRoutes];

    try {
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

        if (slugFromPath && standaloneTenantRoutes.includes(slugFromPath) && user) {
          const { data: businessIds, error: businessIdsError } = await supabase.rpc('get_user_businesses', {
            _user_id: user.id,
          });

          if (businessIdsError) {
            console.error('[StoreContext] Error loading user businesses:', businessIdsError);
          } else {
            const uniqueBusinessIds = [...new Set(businessIds || [])];
            if (uniqueBusinessIds.length === 1) {
              query = query.eq('id', uniqueBusinessIds[0]);
              shouldFetch = true;
            }
          }
        } else if (slugFromPath && !legacyRoutes.includes(slugFromPath)) {
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
          const subscriptionEndDate = business.subscription_end_date || business.trial_end_date;
          const status = business.status || 'active';
          const normalizedStatus = status.trim().toLowerCase();

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
            subscriptionEndDate,
            status,
            suspendedAt: business.suspended_at || undefined,
            accessReactivatedAt: business.access_reactivated_at || undefined,
            suspensionDate: normalizedStatus === 'expired'
              ? subscriptionEndDate || business.suspended_at || business.updated_at || undefined
              : normalizedStatus === 'suspended'
                ? business.suspended_at || business.updated_at || subscriptionEndDate || undefined
                : subscriptionEndDate || undefined,
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
            enableMoneyCollection: business.enable_money_collection ?? false,
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
  }, [location.pathname, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    loadStore();
  }, [authLoading, loadStore]);

  useEffect(() => {
    const endTime = store?.subscriptionEndDate ? new Date(store.subscriptionEndDate).getTime() : NaN;
    if (!Number.isFinite(endTime) || endTime <= Date.now()) return;

    const timeoutId = window.setTimeout(
      () => setExpirationCheckTime(Date.now()),
      endTime - Date.now() + 1,
    );
    return () => window.clearTimeout(timeoutId);
  }, [store?.subscriptionEndDate]);



  const calculateDaysUntilExpiration = (): number => {
    if (!store?.subscriptionEndDate) return 0;
    const endDate = new Date(store.subscriptionEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const normalizedStatus = store?.status.trim().toLowerCase();
  const isLifetimeAccount = normalizedStatus === 'bought';
  const statusBlocksAccess = normalizedStatus === 'suspended' || normalizedStatus === 'expired';
  const subscriptionEndTime = store?.subscriptionEndDate ? new Date(store.subscriptionEndDate).getTime() : NaN;
  const accessReactivatedTime = store?.accessReactivatedAt ? new Date(store.accessReactivatedAt).getTime() : NaN;
  const wasReactivatedAfterExpiration = Number.isFinite(accessReactivatedTime)
    && Number.isFinite(subscriptionEndTime)
    && accessReactivatedTime >= subscriptionEndTime;
  const isExpired = Boolean(store && (
    statusBlocksAccess || (!isLifetimeAccount && Number.isFinite(subscriptionEndTime)
      && subscriptionEndTime < expirationCheckTime && !wasReactivatedAfterExpiration)
  ));
  const daysUntilExpiration = isLifetimeAccount ? 36500 : calculateDaysUntilExpiration();

  useEffect(() => {
    if (!isExpired) return;

    const refreshBlockedStore = () => {
      if (document.visibilityState === 'visible') void loadStore();
    };
    const intervalId = window.setInterval(refreshBlockedStore, 30_000);
    window.addEventListener('focus', refreshBlockedStore);
    document.addEventListener('visibilitychange', refreshBlockedStore);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshBlockedStore);
      document.removeEventListener('visibilitychange', refreshBlockedStore);
    };
  }, [isExpired, loadStore]);

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
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (isCustomDomain(hostname)) {
      return normalizedPath;
    }
    return `/${store.slug}${normalizedPath}`;
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
