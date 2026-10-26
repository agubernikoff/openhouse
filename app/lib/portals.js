/**
 * Franchise portals: gated storefronts served from their own byopenhouse.com
 * subdomain. Nothing in the app is portal-specific; each portal is just an
 * entry here. See guides/franchisePortal/franchisePortal.md.
 *
 * Adding a portal: add an entry, connect the hostname in Shopify admin, and
 * register its Customer Account API callback/origin/logout URLs (plan §5).
 *
 * @typedef {{
 *   name: string;
 *   label: string;
 *   required?: boolean;
 * }} OnboardingField
 *
 * @typedef {{
 *   handle: string;
 *   hostname: string;
 *   name: string;
 *   collectionHandle: string;
 *   leadTime: string;
 *   slackWebhookEnvVar: string;
 *   verification: 'manual';
 *   onboardingFields: OnboardingField[];
 * }} Portal
 *
 * - `collectionHandle`: the Shopify collection that is the portal's catalog.
 * - `leadTime`: lead time copy shown on portal product pages.
 * - `slackWebhookEnvVar`: name of the env var holding the portal's Slack
 *   incoming webhook for new sign-ups (the URL itself is a secret).
 * - `verification`: sign-up verification strategy (portal/verification.server.js).
 * - `onboardingFields`: extra text fields on the sign-up form, e.g.
 *   `{name: 'storeNumber', label: 'Store number', required: true}`.
 */

/** @type {Portal[]} */
export const PORTALS = [
  {
    handle: 'magnolia-bakery',
    hostname: 'magnoliabakery.byopenhouse.com',
    name: 'Magnolia Bakery',
    collectionHandle: 'magnolia-bakery',
    leadTime: 'Ships in under 4 weeks',
    slackWebhookEnvVar: 'SLACK_PORTAL_MAGNOLIA_BAKERY_WEBHOOK_URL',
    verification: 'manual',
    onboardingFields: [],
  },
];

// Paths a portal host serves. Everything else on a portal host redirects to
// `/` (or 404s for non-page requests), so the main site's pages, actions and
// resource routes are never reachable through a portal. See server.js.
const PORTAL_PATHS = [
  '/',
  '/onboarding',
  '/cart',
  '/robots.txt',
  '/__manifest',
];
// `/products/*` loaders 404 anything not tagged for the portal
const PORTAL_PATH_PREFIXES = ['/account', '/products'];

/** Paths that depend on the portal's own config, e.g. its catalog. */
const portalPaths = (portal) => [
  `/collections/${portal.collectionHandle}`,
  `/api/collection-product-count/${portal.collectionHandle}`,
];

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
 * Whether a portal host serves this path. Accepts React Router data request
 * paths too (`/x.data`, `/_root.data`).
 * @param {string} pathname
 * @param {{collectionHandle: string}} portal
 */
export function isPortalPath(pathname, portal) {
  const path =
    pathname === '/_root.data' ? '/' : pathname.replace(/\.data$/, '');
  return (
    PORTAL_PATHS.includes(path) ||
    portalPaths(portal).includes(path) ||
    PORTAL_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
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
  const {handle, name, collectionHandle, leadTime, onboardingFields} = portal;
  return {handle, name, collectionHandle, leadTime, onboardingFields};
}
