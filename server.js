// Virtual entry point for the app
import {storefrontRedirect} from '@shopify/hydrogen';
import {createRequestHandler} from '@shopify/hydrogen/oxygen';
import {createHydrogenRouterContext} from '~/lib/context';
import {
  clearPortalReturnCookie,
  isPortalPath,
  portalFromReturnCookie,
} from '~/lib/portals';

/**
 * Export a fetch handler in module format.
 */
export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} executionContext
   * @return {Promise<Response>}
   */
  async fetch(request, env, executionContext) {
    try {
      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
      );

      // Franchise portal hosts only serve portal paths. Checked here (not just
      // in the root loader) so actions and resource routes are covered too.
      const {portal} = hydrogenContext;
      const url = new URL(request.url);
      // Back from a portal checkout: Shopify's "continue shopping" lands on
      // www's homepage. Send the customer to their portal's orders once.
      if (!portal && url.pathname === '/' && request.method === 'GET') {
        const returnTo = portalFromReturnCookie(request);
        if (returnTo) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: `https://${returnTo.hostname}/account/orders`,
              'Set-Cookie': clearPortalReturnCookie(returnTo, request),
              'Cache-Control': 'no-store',
            },
          });
        }
      }

      if (portal && !isPortalPath(url.pathname, portal)) {
        const isPageLoad =
          request.method === 'GET' && !url.pathname.endsWith('.data');
        // Data requests from client navigation pass through to the loaders
        // (read-only); the root loader and PortalLayout redirect those
        if (isPageLoad) return Response.redirect(new URL('/', url), 302);
        if (request.method !== 'GET') {
          return new Response('Not found', {status: 404});
        }
      }

      /**
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        // eslint-disable-next-line import/no-unresolved
        build: await import('virtual:react-router/server-build'),
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      const response = await handleRequest(request);

      // Franchise portals are private, logged-in stores; keep them out of
      // search indexes entirely.
      if (hydrogenContext.portal) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      }

      // append, not set: a response can also carry other cookies (e.g.
      // Hydrogen's `cart` id cookie), which `set` would silently drop
      if (hydrogenContext.session.isPending) {
        response.headers.append(
          'Set-Cookie',
          await hydrogenContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
