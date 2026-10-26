import {getPortalAccess} from '~/portal/access.server';
import {isPortalProduct, portalProductTag} from '~/lib/portalProducts';

/**
 * Server-side check for merchandise being added to a cart (plan §4.6):
 * - main site: portal products are rejected
 * - portal: only verified members/admins, and only this portal's products
 * The UI never offers anything else; this covers crafted requests.
 * @param {any} context
 * @param {string[]} merchandiseIds - ProductVariant GIDs
 * @return {Promise<{ok: true} | {ok: false; status: number; message: string}>}
 */
export async function checkCartMerchandise(context, merchandiseIds) {
  const {portal, storefront} = context;

  if (portal) {
    const access = await getPortalAccess(context);
    if (access?.role !== 'member' && access?.role !== 'admin') {
      return {
        ok: false,
        status: 403,
        message: 'Your account needs to be verified before you can order.',
      };
    }
  }

  if (!merchandiseIds.length) return {ok: true};

  const {nodes} = await storefront.query(CART_MERCHANDISE_QUERY, {
    variables: {ids: merchandiseIds},
    cache: storefront.CacheNone(),
  });
  const products = nodes.map((node) => node?.product);

  const allowed = portal
    ? products.every((p) => p?.tags?.includes(portalProductTag(portal.handle)))
    : products.every((p) => p && !isPortalProduct(p));

  return allowed
    ? {ok: true}
    : {ok: false, status: 400, message: 'This product isn’t available.'};
}

const CART_MERCHANDISE_QUERY = `#graphql
  query CartMerchandiseTags(
    $ids: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        product {
          tags
        }
      }
    }
  }
`;
