import {redirect} from 'react-router';
import {cartMoqViolations} from '~/lib/portalMoq';
import {requirePortalRole} from '~/portal/access.server';

/**
 * Franchise portal checkout (plan §4.6). Portal cart data never includes
 * `checkoutUrl`; the cart's checkout button comes here so minimum order
 * quantities are re-checked server-side before handing off to Shopify.
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
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

  return redirect(cartData.checkoutUrl);
}

/** @typedef {import('./+types/cart_.checkout').Route} Route */
