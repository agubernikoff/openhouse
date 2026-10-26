import {getSitemap} from '@shopify/hydrogen';
import {PORTALS} from '~/lib/portals';
import {portalProductTag} from '~/lib/portalProducts';

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, params, context: {storefront}}) {
  const response = await getSitemap({
    storefront,
    request,
    params,
    locales: ['EN-US', 'EN-CA', 'FR-CA'],
    getLink: ({type, baseUrl, handle, locale}) => {
      if (!locale) return `${baseUrl}/${type}/${handle}`;
      return `${baseUrl}/${locale}/${type}/${handle}`;
    },
  });

  const body =
    params.type === 'products'
      ? await withoutPortalProducts(await response.text(), storefront)
      : await response.text();

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return new Response(body, {status: response.status, headers});
}

/**
 * getSitemap can't filter, so drop the <url> entries of franchise portal
 * products (plan §4.4) from the products sitemap.
 * @param {string} xml
 * @param {Route.LoaderArgs['context']['storefront']} storefront
 */
async function withoutPortalProducts(xml, storefront) {
  const query = PORTALS.map(
    ({handle}) => `tag:'${portalProductTag(handle)}'`,
  ).join(' OR ');
  const {products} = await storefront.query(PORTAL_PRODUCT_HANDLES_QUERY, {
    variables: {query},
    cache: storefront.CacheShort(),
  });
  const handles = new Set(products.nodes.map((p) => p.handle));
  if (!handles.size) return xml;

  return xml.replace(/<url>[\s\S]*?<\/url>/g, (entry) => {
    const loc = entry.match(/<loc>([^<]*)<\/loc>/)?.[1] ?? '';
    const handle = loc.split('/products/')[1];
    return handle && handles.has(handle) ? '' : entry;
  });
}

const PORTAL_PRODUCT_HANDLES_QUERY = `#graphql
  query PortalProductHandles($query: String!) {
    products(first: 250, query: $query) {
      nodes {
        handle
      }
    }
  }
`;

/** @typedef {import('./+types/sitemap.$type.$page[.xml]').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
