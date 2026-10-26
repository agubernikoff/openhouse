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

  let body = await response.text();
  if (params.type === 'products') {
    body = withoutUrls(
      body,
      'products',
      await portalProductHandles(storefront),
    );
  } else if (params.type === 'collections') {
    body = withoutUrls(
      body,
      'collections',
      new Set(PORTALS.map((p) => p.collectionHandle)),
    );
  }

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return new Response(body, {status: response.status, headers});
}

/**
 * getSitemap can't filter, so franchise portal products and catalogs
 * (plan §4.4) are dropped from the XML afterwards.
 * @param {string} xml
 * @param {'products' | 'collections'} type
 * @param {Set<string>} handles
 */
function withoutUrls(xml, type, handles) {
  if (!handles.size) return xml;
  return xml.replace(/<url>[\s\S]*?<\/url>/g, (entry) => {
    const loc = entry.match(/<loc>([^<]*)<\/loc>/)?.[1] ?? '';
    const handle = loc.split(`/${type}/`)[1];
    return handle && handles.has(handle) ? '' : entry;
  });
}

/**
 * @param {Route.LoaderArgs['context']['storefront']} storefront
 */
async function portalProductHandles(storefront) {
  const query = PORTALS.map(
    ({handle}) => `tag:'${portalProductTag(handle)}'`,
  ).join(' OR ');
  const {products} = await storefront.query(PORTAL_PRODUCT_HANDLES_QUERY, {
    variables: {query},
    cache: storefront.CacheShort(),
  });
  return new Set(products.nodes.map((p) => p.handle));
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
