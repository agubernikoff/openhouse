// app/routes/api/collection-product-count.js
import {excludePortalProducts} from '~/lib/portalProducts';

const QUERY = `
  query CollectionProducts($handle: String!, $cursor: String) {
    collection(handle: $handle) {
      products(first: 250, after: $cursor) {
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
    return json({error: 'Missing handle'}, {status: 400});
  }

  let total = 0;
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await context.storefront.query(QUERY, {
      variables: {handle, cursor},
    });

    const products = res.collection?.products;

    if (!products) {
      return Response.json({error: 'Collection not found'}, {status: 404});
    }

    // Portal products are hidden from main-site collections
    total += excludePortalProducts(products.edges.map((e) => e.node)).length;
    hasNextPage = products.pageInfo.hasNextPage;
    cursor = products.pageInfo.endCursor;
  }

  return Response.json({total});
};
