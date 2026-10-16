import {redirect} from 'react-router';
import {PORTALS} from '~/lib/portals';
import {shopifyAdminFetch} from '~/lib/shopifyAdmin';

/**
 * Portal access is a customer tag, `portal:{handle}:{role}`, managed by
 * Openhouse (or the portal admin) in Shopify. See plan §2 and §4.3.
 * - `pending`: signed up, awaiting verification
 * - `member`:  verified franchisee
 * - `admin`:   the client's corporate account
 * A logged-in customer with none of these tags has role `none`.
 *
 * @typedef {'admin' | 'member' | 'pending' | 'none'} PortalRole
 * @typedef {{customerId: string; role: PortalRole; checkedAt: number}} PortalAccess
 */

/** @param {{handle: string}} portal @param {Exclude<PortalRole, 'none'>} role */
export const portalTag = (portal, role) => `portal:${portal.handle}:${role}`;

// Roles are re-read from Shopify at most this often, so a revoked member
// loses access within a few minutes without an Admin API call per request.
const ACCESS_TTL_MS = 5 * 60 * 1000;

const sessionKey = (handle) => `portalAccess:${handle}`;

/**
 * The logged-in customer's role on the current portal, or null when logged
 * out. Always derived server-side from the session — never from the client.
 * @param {any} context
 * @return {Promise<PortalAccess | null>}
 */
export async function getPortalAccess(context) {
  const {portal, customerAccount, session} = context;
  if (!portal) throw new Error('getPortalAccess called outside a portal');

  if (!(await customerAccount.isLoggedIn())) return null;

  // Pending customers are always re-checked so approval shows up right away
  const cached = session.get(sessionKey(portal.handle));
  const fresh = cached && Date.now() - cached.checkedAt < ACCESS_TTL_MS;
  if (fresh && cached.role !== 'pending') return cached;

  const {data} = await customerAccount.query(CUSTOMER_ID_QUERY);
  const customerId = data?.customer?.id;
  if (!customerId) return null;

  const {customer} = await shopifyAdminFetch(context.env, {
    query: CUSTOMER_TAGS_QUERY,
    variables: {id: customerId},
  });

  return setPortalAccess(
    context,
    customerId,
    roleFromTags(portal, customer?.tags ?? []),
  );
}

/**
 * Caches a role in the session, e.g. right after onboarding tags a customer.
 * @param {any} context
 * @param {string} customerId
 * @param {PortalRole} role
 */
export function setPortalAccess({portal, session}, customerId, role) {
  const access = {customerId, role, checkedAt: Date.now()};
  session.set(sessionKey(portal.handle), access);
  return access;
}

/**
 * Drops cached roles for every portal. Called on login (logout destroys the whole session) so a
 * different customer on the same browser never inherits a cached role.
 * @param {import('~/lib/session').AppSession} session
 */
export function clearPortalAccess(session) {
  for (const {handle} of PORTALS) session.unset(sessionKey(handle));
}

/**
 * Gate for portal routes: returns the customer's access when their role is
 * allowed, otherwise redirects to where they belong.
 * @param {any} context
 * @param {PortalRole[]} roles
 */
export async function requirePortalRole(context, roles) {
  const access = await getPortalAccess(context);
  if (!access) throw redirect('/');
  if (roles.includes(access.role)) return access;
  if (access.role === 'none') throw redirect('/onboarding');
  throw redirect('/');
}

/**
 * @param {{handle: string}} portal
 * @param {string[]} tags
 * @return {PortalRole}
 */
function roleFromTags(portal, tags) {
  for (const role of /** @type {const} */ (['admin', 'member', 'pending'])) {
    if (tags.includes(portalTag(portal, role))) return role;
  }
  return 'none';
}

const CUSTOMER_ID_QUERY = `#graphql
  query PortalCustomerId {
    customer {
      id
    }
  }
`;

const CUSTOMER_TAGS_QUERY = `#graphql
  query PortalCustomerTags($id: ID!) {
    customer(id: $id) {
      tags
    }
  }
`;
