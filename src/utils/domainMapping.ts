export const CUSTOM_DOMAINS: Record<string, string> = {
  "delish.rw": "delish-bakery-ltd",
  "www.delish.rw": "delish-bakery-ltd",
  // "localhost": "delish-bakery-ltd",
};

/**
 * Platform host = the shared app host (DigitalOcean default, or later your main SaaS domain).
 * Set this in DO as: VITE_PLATFORM_HOST=lionfish-app-7g7rn.ondigitalocean.app
 *
 * Why host (not full URL)? Because we build URLs safely.
 */
export const PLATFORM_HOST =
  (import.meta as any).env?.VITE_PLATFORM_HOST ||
  window.location.host; // fallback (works but env var is better)

export const getStoreSlugFromDomain = (hostname: string): string | null => {
  return CUSTOM_DOMAINS[hostname] || null;
};

const isPlatformHost = (hostname: string) => {
  // compare without port
  const clean = hostname.split(":")[0];
  const platformClean = PLATFORM_HOST.split(":")[0];
  return clean === platformClean;
};

export const isCustomDomain = (hostname: string): boolean => {
  // Manual list always wins
  if (CUSTOM_DOMAINS[hostname]) return true;

  // Not custom if local/dev or platform/system hosts
  return (
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    !isPlatformHost(hostname) &&
    !hostname.endsWith(".vercel.app") &&
    !hostname.endsWith(".lovableproject.com") &&
    !hostname.endsWith(".ngrok-free.app") &&
    !hostname.endsWith(".ondigitalocean.app")
  );
};

/**
 * Generate an absolute URL to reach a store route.
 * - If slug has a custom domain => go to that domain
 * - Otherwise => go to platform host under /{slug}
 *
 * IMPORTANT: platform host is dynamic via VITE_PLATFORM_HOST
 */
export const getAbsoluteUrlForStore = (
  slug: string,
  path: string = "/dashboard"
): string => {
  // 1) Custom domain mapping (delish.rw -> delish-bakery-ltd)
  const domainEntry = Object.entries(CUSTOM_DOMAINS).find(
    ([, s]) => s === slug
  );

  if (domainEntry) {
    const [domain] = domainEntry;
    // already on that domain => relative
    if (window.location.hostname === domain) return path;
    return `https://${domain}${path}`;
  }

  // 2) For non-custom store: use platform host
  // If we're already on platform host, just use relative
  if (isPlatformHost(window.location.host)) {
    return `/${slug}${path}`;
  }

  // If we're on a custom domain but need to jump to platform for another store
  return `https://${PLATFORM_HOST}/${slug}${path}`;
};
