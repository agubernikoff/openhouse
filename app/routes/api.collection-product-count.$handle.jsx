// app/routes/api/collection-product-count.js

const QUERY = `
  query CollectionProducts($handle: String!, $cursor: String) {
    collection(handle: $handle) {
      products(first: 250, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node { id }
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

    total += products.edges.length;
    hasNextPage = products.pageInfo.hasNextPage;
    cursor = products.pageInfo.endCursor;
  }

  return Response.json({total});
};
