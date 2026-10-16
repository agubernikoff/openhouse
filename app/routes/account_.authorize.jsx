import {clearPortalAccess} from '~/portal/access.server';

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  // A new login may be a different customer — drop any cached portal roles
  clearPortalAccess(context.session);
  return context.customerAccount.authorize();
}

/** @typedef {import('./+types/account_.authorize').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
