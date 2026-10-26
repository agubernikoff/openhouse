import {PORTALS} from '~/lib/portals';

/**
 * Franchise portal products are tagged `portal:{handle}` (plan §2) and must
 * never appear on the main site. Most Storefront API product sources can't
 * exclude by tag (collection filters only match tags, recommendations take no
 * filters, and a tag clause in a search query makes Shopify drop the search
 * term), so main-site loaders fetch `tags` and filter server-side with these
 * helpers before any data reaches the browser.
 */

const PORTAL_PRODUCT_TAG_PREFIX = 'portal:';

/** @param {string} handle */
export const portalProductTag = (handle) =>
  `${PORTAL_PRODUCT_TAG_PREFIX}${handle}`;

/**
 * @param {{tags?: string[]} | null | undefined} product
 */
export function isPortalProduct(product) {
  if (!Array.isArray(product?.tags)) {
    // A fragment is missing `tags`, so this product can't be checked
    if (process.env.NODE_ENV === 'development' && product) {
      console.warn('[portal] product queried without `tags`', product);
    }
    return false;
  }
  return product.tags.some((tag) => tag.startsWith(PORTAL_PRODUCT_TAG_PREFIX));
}

/**
 * @template {{tags?: string[]}} T
 * @param {T[] | null | undefined} products
 * @return {T[]}
 */
export function excludePortalProducts(products) {
  return (products ?? []).filter((product) => !isPortalProduct(product));
}

/**
 * Same, for a connection (`{nodes, ...}`), keeping pageInfo etc. intact.
 * Filtering after pagination can make a page a little short; acceptable
 * because portal products are few and kept out of main-site collections.
 * @template {{nodes: any[]}} C
 * @param {C | null | undefined} connection
 * @return {C | null | undefined}
 */
export function excludePortalProductNodes(connection) {
  if (!connection?.nodes) return connection;
  return {...connection, nodes: excludePortalProducts(connection.nodes)};
}

/**
 * Storefront `products(query:)` does support tag exclusion, so the catalog
 * query excludes portal products up front (keeps pagination exact).
 * e.g. `-tag:'portal:magnolia-bakery'`
 */
export const EXCLUDE_PORTAL_PRODUCTS_QUERY = PORTALS.map(
  ({handle}) => `-tag:'${portalProductTag(handle)}'`,
).join(' ');

/**
 * The inverse, for a portal's own catalog: keep only products tagged for
 * this portal. Fails closed — a product without `tags` is dropped.
 * @template {{nodes: any[]}} C
 * @param {C | null | undefined} connection
 * @param {{handle: string}} portal
 * @return {C | null | undefined}
 */
export function onlyPortalProductNodes(connection, portal) {
  if (!connection?.nodes) return connection;
  const tag = portalProductTag(portal.handle);
  return {
    ...connection,
    nodes: connection.nodes.filter((p) => p.tags?.includes(tag)),
  };
}

/**
 * A portal's catalog collection (`portal.collectionHandle`) is hidden on the
 * main site too: no page, not in listings, search suggestions or sitemap.
 * @param {string | null | undefined} handle
 */
export function isPortalCollection(handle) {
  return PORTALS.some((portal) => portal.collectionHandle === handle);
}

/**
 * @template {{handle: string}} T
 * @param {T[] | null | undefined} collections
 * @return {T[]}
 */
export function excludePortalCollections(collections) {
  return (collections ?? []).filter((c) => !isPortalCollection(c.handle));
}
