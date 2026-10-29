import {redirect} from 'react-router';
import {cartMoqViolations} from '~/lib/portalMoq';
import {portalReturnCookie} from '~/lib/portals';
import {requirePortalRole} from '~/portal/access.server';

/**
 * Franchise portal checkout (plan §4.6). Portal cart data never includes
 * `checkoutUrl`; the cart's checkout button comes here so minimum order
 * quantities are re-checked server-side before handing off to Shopify.
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  const {portal, cart} = context;
  if (!portal) throw new Response('Not found', {status: 404});

  await requirePortalRole(context, ['member', 'admin']);

  const cartData = await cart.get();
  if (
    !cartData?.checkoutUrl ||
    !cartData.lines?.nodes?.length ||
    cartMoqViolations(cartData).size > 0
  ) {
    return redirect('/cart');
  }

  // So Shopify's "continue shopping" (which goes to www) returns here
  return redirect(cartData.checkoutUrl, {
    headers: {'Set-Cookie': portalReturnCookie(portal, request)},
  });
}

/** @typedef {import('./+types/cart_.checkout').Route} Route */
