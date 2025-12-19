export const CUSTOM_DOMAINS: Record<string, string> = {
  'delish.rw': 'delish-bakery-ltd',
  'www.delish.rw': 'delish-bakery-ltd',
  // Add localhost for testing purposes if needed
  // 'localhost': 'delish-bakery-ltd', 
};

export const MAIN_DOMAIN = 'dev.delish.rw';

export const getStoreSlugFromDomain = (hostname: string): string | null => {
  return CUSTOM_DOMAINS[hostname] || null;
};

export const isCustomDomain = (hostname: string): boolean => {
  return !!CUSTOM_DOMAINS[hostname];
};

export const getAbsoluteUrlForStore = (slug: string, path: string = '/dashboard'): string => {
  // Check if this slug maps to a custom domain
  const domainEntry = Object.entries(CUSTOM_DOMAINS).find(([domain, s]) => s === slug);
  
  if (domainEntry) {
    const [domain] = domainEntry;
    // If we are already on this domain, use relative path
    if (window.location.hostname === domain) {
        return path;
    }
    return `https://${domain}${path}`;
  }
  
  // If we are on a custom domain, we need to jump back to main domain for other stores
  if (isCustomDomain(window.location.hostname)) {
    return `https://${MAIN_DOMAIN}/${slug}${path}`;
  }
  
  // We are on main domain, use relative path
  return `/${slug}${path}`;
};
