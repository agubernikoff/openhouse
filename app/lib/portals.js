/**
 * Franchise portals: gated storefronts served from their own byopenhouse.com
 * subdomain. Each portal is a `franchise_portal` metaobject in Shopify admin
 * (Content → Metaobjects), so adding a brand needs no code change. See
 * guides/franchisePortal/franchisePortal.md (§5, §7).
 *
 * The metaobject handle is the portal handle and must match its tags
 * (`portal:{handle}` on products, orders and customers). Secrets stay out of
 * metaobjects (they're readable via the public Storefront API): the Slack
 * sign-up webhook is the env var named by `slackWebhookEnvVar`.
 *
 * @typedef {{
 *   name: string;
 *   label: string;
 *   required?: boolean;
 * }} OnboardingField
 *
 * @typedef {{url: string; width?: number; height?: number; altText?: string | null}} PortalImage
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
 *   theme: Record<string, string>;
 *   logos: {header: PortalImage | null; landing: PortalImage | null; mark: PortalImage | null};
 *   copy: {landingHeadline: string; landingBody: string; pendingMessage: string};
 * }} Portal
 */

/**
 * All portals, from the `franchise_portal` metaobjects. Cached briefly, so
 * admin edits show up within a few minutes. Throws if Shopify can't be
 * reached: failing beats serving a portal hostname as the main site.
 * @param {any} storefront
 * @return {Promise<Portal[]>}
 */
export async function loadPortals(storefront) {
  const {metaobjects} = await storefront.query(PORTALS_QUERY, {
    cache: storefront.CacheCustom({
      mode: 'public',
      maxAge: 60,
      staleWhileRevalidate: 600,
    }),
  });
  return metaobjects.nodes.map(toPortal).filter(Boolean);
}

/** @return {Portal | null} */
function toPortal(node) {
  const fields = Object.fromEntries(node.fields.map((f) => [f.key, f]));
  const text = (key) => fields[key]?.value?.trim() || '';
  const hostname = text('hostname').toLowerCase();
  const collectionHandle = fields.collection?.reference?.handle;
  if (!hostname || !collectionHandle) {
    console.error(`Portal "${node.handle}" needs a hostname and collection`);
    return null;
  }

  const name = text('name') || node.handle;
  const color = (key, fallback) => {
    const value = text(key);
    return /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;
  };
  const image = (key) => fields[key]?.reference?.image ?? null;
  const font = text('font_family');

  return {
    handle: node.handle,
    hostname,
    name,
    collectionHandle,
    leadTime: text('lead_time'),
    // e.g. magnolia-bakery → SLACK_PORTAL_MAGNOLIA_BAKERY_WEBHOOK_URL
    slackWebhookEnvVar: `SLACK_PORTAL_${node.handle
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')}_WEBHOOK_URL`,
    verification: 'manual',
    onboardingFields: parseOnboardingFields(fields.onboarding_fields?.value),
    theme: {
      // Only plain family names (no CSS injection via admin input)
      fontFamily: /^[\w -]+$/.test(font) ? font : '',
      text: color('color_text', '#2d2d2b'),
      background: color('color_background', '#ffffff'),
      accent: color('color_accent', '#f4f2ea'),
      button: color('color_button', '#2d2d2b'),
      buttonText: color('color_button_text', '#ffffff'),
      error: color('color_error', '#d8240c'),
      errorBackground: color('color_error_background', '#ffffff'),
    },
    logos: {
      header: image('logo_header'),
      landing: image('logo_landing'),
      mark: image('logo_mark'),
    },
    copy: {
      landingHeadline: text('landing_headline') || `${name} ordering portal`,
      landingBody:
        text('landing_body') ||
        `Sign in or create an account to order approved ${name} merchandise.`,
      pendingMessage:
        text('pending_message') ||
        `Openhouse is verifying your ${name} account. You’ll be able to place orders as soon as it’s approved.`,
    },
  };
}

/** @return {OnboardingField[]} */
function parseOnboardingFields(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter((f) => f?.name && f?.label)
          .map((f) => ({
            name: String(f.name),
            label: String(f.label),
            required: !!f.required,
          }))
      : [];
  } catch {
    console.error('Invalid portal onboarding_fields JSON');
    return [];
  }
}

const PORTALS_QUERY = `#graphql
  query FranchisePortals {
    metaobjects(type: "franchise_portal", first: 50) {
      nodes {
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image {
                url
                width
                height
                altText
              }
            }
            ... on Collection {
              handle
            }
          }
        }
      }
    }
  }
`;

// Paths a portal host serves. Everything else on a portal host redirects to
// `/` (or 404s for non-page requests), so the main site's pages, actions and
// resource routes are never reachable through a portal. See server.js.
const PORTAL_PATHS = [
  '/',
  '/onboarding',
  '/cart',
  '/cart/checkout',
  '/robots.txt',
  '/__manifest',
];
// `/products/*` loaders 404 anything not tagged for the portal
const PORTAL_PATH_PREFIXES = ['/account', '/products', '/admin'];

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
 * @param {Portal[]} portals
 * @return {Portal | null}
 */
export function resolvePortal(request, env, portals) {
  if (process.env.NODE_ENV === 'development' && env.PORTAL_DEV_HANDLE) {
    return portals.find((p) => p.handle === env.PORTAL_DEV_HANDLE) ?? null;
  }

  const {hostname} = new URL(request.url);
  return portals.find((p) => p.hostname === hostname) ?? null;
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
  const {
    handle,
    name,
    collectionHandle,
    leadTime,
    onboardingFields,
    theme,
    logos,
    copy,
  } = portal;
  return {
    handle,
    name,
    collectionHandle,
    leadTime,
    onboardingFields,
    theme,
    logos,
    copy,
  };
}

/**
 * Return-to-portal after checkout (plan §4.9). Shopify's thank-you page
 * links to the store's primary domain (www), not the portal, so starting
 * checkout from a portal sets a one-time hint cookie on the shared parent
 * domain; www's homepage reads it once and sends the customer back. It only
 * names the portal — the portal still requires its normal login.
 */
export const PORTAL_RETURN_COOKIE = 'oh_portal_return';
const PORTAL_RETURN_MAX_AGE = 2 * 60 * 60; // checkout is usually minutes

/** e.g. magnoliabakery.byopenhouse.com → .byopenhouse.com */
function sharedCookieDomain(portal) {
  return `.${portal.hostname.split('.').slice(1).join('.')}`;
}

/**
 * Set-Cookie value marking a checkout that started on `portal`.
 * @param {Portal} portal
 * @param {Request} request
 */
export function portalReturnCookie(portal, request) {
  return buildReturnCookie(
    portal,
    request,
    portal.handle,
    PORTAL_RETURN_MAX_AGE,
  );
}

/**
 * Set-Cookie value clearing the hint (must match the domain it was set on).
 * @param {Portal} portal
 * @param {Request} request
 */
export function clearPortalReturnCookie(portal, request) {
  return buildReturnCookie(portal, request, '', 0);
}

function buildReturnCookie(portal, request, value, maxAge) {
  const domain = sharedCookieDomain(portal);
  const {hostname} = new URL(request.url);
  // Only scope to the shared domain when this host is under it (not in local
  // dev, where the portal is forced via PORTAL_DEV_HANDLE)
  const domainAttr = hostname.endsWith(domain) ? `; Domain=${domain}` : '';
  return `${PORTAL_RETURN_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax${domainAttr}`;
}

/**
 * The portal a main-site request should return to, if it carries the hint.
 * @param {Request} request
 * @param {Portal[]} portals
 * @return {Portal | null}
 */
export function portalFromReturnCookie(request, portals) {
  const cookies = request.headers.get('Cookie') ?? '';
  const match = cookies.match(
    new RegExp(`(?:^|;\\s*)${PORTAL_RETURN_COOKIE}=([^;]+)`),
  );
  if (!match) return null;
  return portals.find((p) => p.handle === decodeURIComponent(match[1])) ?? null;
}
