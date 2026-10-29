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

/**
 * Portal cart data sent to the browser omits `checkoutUrl`, so checkout can
 * only start from /cart/checkout (which enforces MOQ). Not airtight without
 * Shopify Plus — see plan §4.6 — but keeps the portal UI honest.
 * @template T
 * @param {T} cart
 * @return {T}
 */
export function withoutCheckoutUrl(cart) {
  if (!cart) return cart;
  const rest = {...cart};
  delete rest.checkoutUrl;
  return rest;
}

/**
 * Tags a portal cart with `_portal` (once) so the order carries the portal
 * (plan §4.7). Returns the cart result to use going forward.
 * @param {any} context
 * @param {any} result - result of a cart mutation
 */
export async function tagPortalCart(context, result) {
  const {portal, cart} = context;
  const tagged = result?.cart?.attributes?.some((a) => a.key === '_portal');
  if (!portal || !result?.cart?.id || tagged) return result;
  return cart.updateAttributes([{key: '_portal', value: portal.handle}]);
}

/**
 * Re-order (plan §4.7): adds a past portal order's lines to the cart at
 * current prices, keeping each line's `_color` so the cart groups them.
 * Lines whose variant is gone, unavailable, or no longer in this portal are
 * skipped. MOQ is left to the cart's usual check.
 * @param {any} context
 * @param {{lineItems: {nodes: {variantId?: string | null; quantity: number; customAttributes?: {key: string; value?: string | null}[]}[]}}} order
 * @return {Promise<{ok: true; result: any; added: number; skipped: number} | {ok: false; status: number; message: string}>}
 */
export async function reorderPortalOrder(context, order) {
  const {portal, storefront, cart} = context;
  const items = order.lineItems.nodes.filter((l) => l.quantity > 0);

  const variantIds = [
    ...new Set(items.map((l) => l.variantId).filter(Boolean)),
  ];
  const {nodes} = variantIds.length
    ? await storefront.query(REORDER_VARIANTS_QUERY, {
        variables: {ids: variantIds},
        cache: storefront.CacheNone(),
      })
    : {nodes: []};
  const orderable = new Set(
    nodes
      .filter(
        (v) =>
          v?.availableForSale &&
          v.product?.tags?.includes(portalProductTag(portal.handle)),
      )
      .map((v) => v.id),
  );

  const lines = items
    .filter((l) => orderable.has(l.variantId))
    .map((l) => {
      const color = l.customAttributes?.find((a) => a.key === '_color');
      return {
        merchandiseId: l.variantId,
        quantity: l.quantity,
        ...(color?.value && {
          attributes: [{key: '_color', value: color.value}],
        }),
      };
    });
  const skipped = items.length - lines.length;

  if (!lines.length) {
    return {
      ok: false,
      status: 409,
      message: 'None of the items in this order are available any more.',
    };
  }

  // Same guard as the cart action (verified member, this portal's products)
  const check = await checkCartMerchandise(
    context,
    lines.map((l) => l.merchandiseId),
  );
  if (!check.ok) return check;

  const result = await tagPortalCart(context, await cart.addLines(lines));
  return {ok: true, result, added: lines.length, skipped};
}

const REORDER_VARIANTS_QUERY = `#graphql
  query ReorderVariants(
    $ids: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        availableForSale
        product {
          tags
        }
      }
    }
  }
`;
