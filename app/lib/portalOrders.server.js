import {getPortalAccess} from '~/portal/access.server';
import {portalProductTag} from '~/lib/portalProducts';
import {shopifyAdminFetch} from '~/lib/shopifyAdmin';

/**
 * Franchise portal orders via the Admin API (plan §4.7). The Customer
 * Account API version the storefront calls has no order attributes or tags,
 * so portal orders are found by the Flow tag `portal:{handle}` (or the
 * `_portal` attribute), always scoped to the session's own customer ID.
 */

/**
 * The logged-in customer's portal orders, newest first, shaped like the
 * Customer Account API orders the account pages render.
 * @param {any} context
 * @param {string | undefined} search - order number / confirmation search
 */
export async function listPortalOrders(context, search) {
  const customerId = await sessionCustomerNumber(context);
  if (!customerId) return [];

  const query = [
    `customer_id:${customerId}`,
    `tag:'${portalProductTag(context.portal.handle)}'`,
    search,
  ]
    .filter(Boolean)
    .join(' AND ');

  const {orders} = await shopifyAdminFetch(context.env, {
    query: PORTAL_ORDERS_QUERY,
    variables: {query},
  });

  return orders.nodes.map((o) => ({
    id: o.id,
    number: o.number,
    confirmationNumber: o.confirmationNumber,
    processedAt: o.processedAt,
    financialStatus: o.displayFinancialStatus,
    totalPrice: o.totalPriceSet.shopMoney,
    ...normalizeFulfillment(o),
  }));
}

/**
 * One of the logged-in customer's portal orders, or null if the order isn't
 * theirs or isn't from this portal. Includes status and tracking; pass
 * `{withLines: true}` for re-order (line variants need `read_products`).
 * @param {any} context
 * @param {string} orderId - Order GID
 * @param {{withLines?: boolean}} [options]
 */
export async function getPortalOrder(context, orderId, {withLines} = {}) {
  const access = await getPortalAccess(context);
  if (!access) return null;

  const {order} = await shopifyAdminFetch(context.env, {
    query: withLines ? PORTAL_ORDER_WITH_LINES_QUERY : PORTAL_ORDER_QUERY,
    variables: {id: orderId},
  });
  if (!order || order.customer?.id !== access.customerId) return null;

  const tag = portalProductTag(context.portal.handle);
  const fromPortal =
    order.tags.includes(tag) ||
    order.customAttributes.some(
      (a) => a.key === '_portal' && a.value === context.portal.handle,
    );
  if (!fromPortal) return null;

  return {
    ...normalizeFulfillment(order),
    lineItems: withLines && {
      nodes: order.lineItems.nodes.map((l) => ({
        variantId: l.variant?.id ?? null,
        // currentQuantity excludes removed/refunded units
        quantity: l.currentQuantity,
        customAttributes: l.customAttributes,
      })),
    },
  };
}

/** Admin order → the shape portalOrderStatus / portalOrderTracking read. */
function normalizeFulfillment(order) {
  return {
    fulfillmentStatus: order.displayFulfillmentStatus,
    fulfillments: {
      nodes: order.fulfillments.map((f) => ({
        latestShipmentStatus: f.displayStatus,
        trackingInformation: f.trackingInfo ?? [],
      })),
    },
  };
}

async function sessionCustomerNumber(context) {
  const access = await getPortalAccess(context);
  return access?.customerId?.split('/').pop() ?? null;
}

const PORTAL_ORDERS_QUERY = `#graphql
  query PortalOrders($query: String!) {
    orders(first: 100, sortKey: PROCESSED_AT, reverse: true, query: $query) {
      nodes {
        id
        number
        confirmationNumber
        processedAt
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        fulfillments(first: 10) {
          displayStatus
          trackingInfo {
            company
            number
            url
          }
        }
      }
    }
  }
`;

const PORTAL_ORDER_FIELDS = `
  id
  tags
  customer {
    id
  }
  customAttributes {
    key
    value
  }
  displayFulfillmentStatus
  fulfillments(first: 10) {
    displayStatus
    trackingInfo {
      company
      number
      url
    }
  }
`;

const PORTAL_ORDER_QUERY = `#graphql
  query PortalOrder($id: ID!) {
    order(id: $id) {
      ${PORTAL_ORDER_FIELDS}
    }
  }
`;

const PORTAL_ORDER_WITH_LINES_QUERY = `#graphql
  query PortalOrderWithLines($id: ID!) {
    order(id: $id) {
      ${PORTAL_ORDER_FIELDS}
      lineItems(first: 100) {
        nodes {
          currentQuantity
          variant {
            id
          }
          customAttributes {
            key
            value
          }
        }
      }
    }
  }
`;
