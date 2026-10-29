/**
 * Franchise portal orders (plan §4.7). A portal order carries the
 * `_portal: {handle}` attribute from its cart, which the Customer Account
 * API exposes on the order, so history doesn't depend on the Flow order tag.
 */

/**
 * @param {{customAttributes?: {key: string; value?: string | null}[]}} order
 * @param {{handle: string}} portal
 */
export function isPortalOrder(order, portal) {
  return !!order?.customAttributes?.some(
    (a) => a.key === '_portal' && a.value === portal.handle,
  );
}

/**
 * Franchisee-facing status: Submitted → Shipped → Delivered.
 * @param {{
 *   fulfillmentStatus?: string;
 *   fulfillments?: {nodes?: {latestShipmentStatus?: string | null}[]};
 * }} order
 */
export function portalOrderStatus(order) {
  const fulfillments = order?.fulfillments?.nodes ?? [];
  if (
    order?.fulfillmentStatus === 'FULFILLED' &&
    fulfillments.length &&
    fulfillments.every((f) => f.latestShipmentStatus === 'DELIVERED')
  ) {
    return 'Delivered';
  }
  switch (order?.fulfillmentStatus) {
    case 'FULFILLED':
      return 'Shipped';
    case 'PARTIALLY_FULFILLED':
      return 'Partially shipped';
    default:
      return 'Submitted';
  }
}

/**
 * @param {{fulfillments?: {nodes?: {trackingInformation?: {company?: string | null; number?: string | null; url?: string | null}[]}[]}}} order
 */
export function portalOrderTracking(order) {
  return (order?.fulfillments?.nodes ?? []).flatMap(
    (f) => f.trackingInformation ?? [],
  );
}
