import {getPortalAccess, portalTag, roleFromTags} from '~/portal/access.server';
import {portalProductTag} from '~/lib/portalProducts';
import {shopifyAdminFetch} from '~/lib/shopifyAdmin';

/**
 * Corporate admin views for a franchise portal (plan §4.8, roadmap 12n/12o),
 * via the Admin API. Callers gate on the `admin` role; everything here is
 * scoped to `context.portal` and re-checks targets before changing them.
 */

const PAGE_SIZE = 25;

/** Free-text search: plain words, emails and order numbers only. */
function cleanSearch(q) {
  return String(q ?? '')
    .replace(/[^\w@.\-# ]/g, ' ')
    .trim()
    .slice(0, 80);
}

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? '');

/**
 * All of this portal's orders, newest first.
 * @param {any} context
 * @param {{q?: string; status?: string; from?: string; to?: string; after?: string}} filters
 */
export async function listAllPortalOrders(context, filters) {
  const parts = [`tag:'${portalProductTag(context.portal.handle)}'`];
  const q = cleanSearch(filters.q);
  if (q) parts.push(q);
  if (filters.status === 'unfulfilled')
    parts.push('fulfillment_status:unshipped');
  if (filters.status === 'fulfilled') parts.push('fulfillment_status:shipped');
  if (isDate(filters.from)) parts.push(`processed_at:>='${filters.from}'`);
  if (isDate(filters.to)) parts.push(`processed_at:<='${filters.to}T23:59:59'`);

  const {orders} = await shopifyAdminFetch(context.env, {
    query: ALL_ORDERS_QUERY,
    variables: {
      query: parts.join(' AND '),
      first: PAGE_SIZE,
      after: filters.after || null,
    },
  });
  return orders;
}

/**
 * One of this portal's orders (any franchisee), or null.
 * @param {any} context
 * @param {string} orderId - Order GID
 */
export async function getAnyPortalOrder(context, orderId) {
  const {order} = await shopifyAdminFetch(context.env, {
    query: ORDER_DETAIL_QUERY,
    variables: {id: orderId},
  });
  const {handle} = context.portal;
  const fromPortal =
    order?.tags.includes(portalProductTag(handle)) ||
    order?.customAttributes.some(
      (a) => a.key === '_portal' && a.value === handle,
    );
  return fromPortal ? order : null;
}

/**
 * Customers with any role on this portal.
 * @param {any} context
 * @param {{q?: string; status?: string; after?: string}} filters
 */
export async function listPortalMembers(context, filters) {
  const {portal} = context;
  const roles = ['pending', 'member', 'admin', 'revoked'];
  const wanted = roles.includes(filters.status) ? [filters.status] : roles;
  const parts = [
    `(${wanted.map((r) => `tag:'${portalTag(portal, r)}'`).join(' OR ')})`,
  ];
  const q = cleanSearch(filters.q);
  if (q) parts.push(q);

  const {customers} = await shopifyAdminFetch(context.env, {
    query: MEMBERS_QUERY,
    variables: {
      query: parts.join(' AND '),
      first: PAGE_SIZE,
      after: filters.after || null,
    },
  });
  return {
    ...customers,
    nodes: customers.nodes.map((c) => ({
      ...c,
      role: roleFromTags(portal, c.tags),
    })),
  };
}

const TRANSITIONS = {
  approve: {from: 'pending', to: 'member'},
  revoke: {from: 'member', to: 'revoked'},
  restore: {from: 'revoked', to: 'member'},
};

/**
 * Approve / revoke / restore a portal member. Only from the expected role,
 * only for this portal's customers, never on admins or yourself.
 * @param {any} context
 * @param {string} customerId
 * @param {'approve' | 'revoke' | 'restore'} intent
 * @return {Promise<{ok: true} | {ok: false; message: string}>}
 */
export async function changeMemberAccess(context, customerId, intent) {
  const transition = TRANSITIONS[intent];
  if (!transition) return {ok: false, message: 'Unknown action.'};

  const actor = await getPortalAccess(context);
  if (actor?.role !== 'admin') return {ok: false, message: 'Not allowed.'};
  if (actor.customerId === customerId) {
    return {ok: false, message: 'You can’t change your own access.'};
  }

  const {portal, env} = context;
  const {customer} = await shopifyAdminFetch(env, {
    query: CUSTOMER_TAGS_QUERY,
    variables: {id: customerId},
  });
  const role = customer && roleFromTags(portal, customer.tags);
  if (role !== transition.from) {
    return {
      ok: false,
      message: 'This member’s status has changed. Refresh and try again.',
    };
  }

  // Drop every other role tag for this portal, then add the new one
  const remove = ['pending', 'member', 'revoked']
    .filter((r) => r !== transition.to)
    .map((r) => portalTag(portal, r));
  const removed = await shopifyAdminFetch(env, {
    query: TAGS_REMOVE_MUTATION,
    variables: {id: customerId, tags: remove},
  });
  const added = await shopifyAdminFetch(env, {
    query: TAGS_ADD_MUTATION,
    variables: {id: customerId, tags: [portalTag(portal, transition.to)]},
  });
  const errors = [
    ...(removed.tagsRemove?.userErrors ?? []),
    ...(added.tagsAdd?.userErrors ?? []),
  ];
  if (errors.length) {
    console.error('Portal member access change failed:', errors);
    return {ok: false, message: 'Couldn’t update this member. Try again.'};
  }
  return {ok: true};
}

const MONEY = `amount currencyCode`;

const ALL_ORDERS_QUERY = `#graphql
  query PortalAdminOrders($query: String!, $first: Int!, $after: String) {
    orders(
      first: $first
      after: $after
      query: $query
      sortKey: PROCESSED_AT
      reverse: true
    ) {
      nodes {
        id
        name
        processedAt
        displayFinancialStatus
        displayFulfillmentStatus
        currentSubtotalLineItemsQuantity
        totalPriceSet {
          shopMoney {
            ${MONEY}
          }
        }
        customer {
          displayName
          defaultEmailAddress {
            emailAddress
          }
        }
        shippingAddress {
          company
          city
          provinceCode
        }
        fulfillments(first: 10) {
          displayStatus
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const ORDER_DETAIL_QUERY = `#graphql
  query PortalAdminOrder($id: ID!) {
    order(id: $id) {
      id
      name
      processedAt
      tags
      customAttributes {
        key
        value
      }
      displayFinancialStatus
      displayFulfillmentStatus
      totalPriceSet {
        shopMoney {
          ${MONEY}
        }
      }
      customer {
        displayName
        defaultEmailAddress {
          emailAddress
        }
      }
      shippingAddress {
        name
        company
        address1
        address2
        city
        provinceCode
        zip
      }
      fulfillments(first: 10) {
        displayStatus
        trackingInfo {
          company
          number
          url
        }
      }
      lineItems(first: 100) {
        nodes {
          id
          title
          variantTitle
          sku
          currentQuantity
          customAttributes {
            key
            value
          }
          originalUnitPriceSet {
            shopMoney {
              ${MONEY}
            }
          }
        }
      }
    }
  }
`;

const MEMBERS_QUERY = `#graphql
  query PortalAdminMembers($query: String!, $first: Int!, $after: String) {
    customers(
      first: $first
      after: $after
      query: $query
      sortKey: CREATED_AT
      reverse: true
    ) {
      nodes {
        id
        displayName
        createdAt
        tags
        numberOfOrders
        defaultEmailAddress {
          emailAddress
        }
        addressesV2(first: 10) {
          nodes {
            company
            city
            provinceCode
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const CUSTOMER_TAGS_QUERY = `#graphql
  query PortalAdminCustomerTags($id: ID!) {
    customer(id: $id) {
      id
      tags
    }
  }
`;

const TAGS_REMOVE_MUTATION = `#graphql
  mutation PortalAdminTagsRemove($id: ID!, $tags: [String!]!) {
    tagsRemove(id: $id, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`;

const TAGS_ADD_MUTATION = `#graphql
  mutation PortalAdminTagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`;
