/**
 * Franchise portals: gated storefronts served from their own byopenhouse.com
 * subdomain. Nothing in the app is portal-specific; each portal is just an
 * entry here. See guides/franchisePortal/franchisePortal.md.
 *
 * Adding a portal: add an entry, connect the hostname in Shopify admin, and
 * register its Customer Account API callback/origin/logout URLs (plan §5).
 *
 * @typedef {{
 *   handle: string;
 *   hostname: string;
 *   name: string;
 * }} Portal
 */

/** @type {Portal[]} */
export const PORTALS = [
  {
    handle: 'magnolia-bakery',
    hostname: 'magnoliabakery.byopenhouse.com',
    name: 'Magnolia Bakery',
  },
];

// Paths a portal host serves. Everything else on a portal host redirects to
// `/`, so the main site's pages are never reachable through a portal.
const PORTAL_PATHS = ['/', '/robots.txt'];
const PORTAL_PATH_PREFIXES = ['/account'];

/**
 * Resolves the portal for a request from its hostname. Returns null for the
 * main Openhouse site (and any unknown host).
 *
 * Locally, Customer Account API login needs a tunnel whose hostname isn't a
 * portal's, so `PORTAL_DEV_HANDLE` in .env forces a portal in development only.
 * @param {Request} request
 * @param {Env} env
 * @return {Portal | null}
 */
export function resolvePortal(request, env) {
  if (process.env.NODE_ENV === 'development' && env.PORTAL_DEV_HANDLE) {
    return PORTALS.find((p) => p.handle === env.PORTAL_DEV_HANDLE) ?? null;
  }

  const {hostname} = new URL(request.url);
  return PORTALS.find((p) => p.hostname === hostname) ?? null;
}

/**
 * @param {string} pathname
 */
export function isPortalPath(pathname) {
  return (
    PORTAL_PATHS.includes(pathname) ||
    PORTAL_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

/**
 * The subset of portal config that's safe to send to the browser. Future
 * config (e.g. Slack webhook env var names) stays server-side.
 * @param {Portal | null} portal
 */
export function toPublicPortal(portal) {
  if (!portal) return null;
  const {handle, name} = portal;
  return {handle, name};
}
