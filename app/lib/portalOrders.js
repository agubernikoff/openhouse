/**
 * Franchise portal order status and tracking, from orders normalized by
 * lib/portalOrders.server.js (plan §4.7).
 */

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
