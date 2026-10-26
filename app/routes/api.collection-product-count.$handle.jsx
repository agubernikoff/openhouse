// Total products in a collection for the "N Products" label, honoring the
// page's active `?filter=` params (the page itself only has one page of 12)
import {parseFilterParams} from '~/lib/filterParams';
import {
  excludePortalProducts,
  isPortalCollection,
  onlyPortalProductNodes,
} from '~/lib/portalProducts';

const QUERY = `
  query CollectionProducts(
    $handle: String!
    $cursor: String
    $filters: [ProductFilter!]
  ) {
    collection(handle: $handle) {
      products(first: 250, after: $cursor, filters: $filters) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node { id tags }
        }
      }
    }
  }
`;

export const loader = async ({request, context, params}) => {
  const url = new URL(request.url);
  const handle = params.handle;
  if (!handle) {
    return Response.json({error: 'Missing handle'}, {status: 400});
  }
  // Portal catalogs are only counted on their own portal
  if (!context.portal && isPortalCollection(handle)) {
    return Response.json({error: 'Collection not found'}, {status: 404});
  }

  const filters = parseFilterParams(url.searchParams);
  let total = 0;
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await context.storefront.query(QUERY, {
      variables: {handle, cursor, filters},
    });

    const products = res.collection?.products;

    if (!products) {
      return Response.json({error: 'Collection not found'}, {status: 404});
    }

    // Portal products only count on their own portal's catalog
    const nodes = products.edges.map((e) => e.node);
    total += context.portal
      ? onlyPortalProductNodes({nodes}, context.portal).nodes.length
      : excludePortalProducts(nodes).length;
    hasNextPage = products.pageInfo.hasNextPage;
    cursor = products.pageInfo.endCursor;
  }

  return Response.json({total});
};
