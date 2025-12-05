import {redirect, useLoaderData, NavLink, useSearchParams} from 'react-router';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductItem} from '~/components/ProductItem';
import {useState} from 'react';
import {motion} from 'motion/react';
import Filter, {FilterColumns} from '~/components/Filter';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `Hydrogen | ${data?.collection.title ?? ''} Collection`}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  const filters = [];
  let reverse = false;
  let sortKey = 'BEST_SELLING';

  if (!handle) {
    throw redirect('/collections');
  }

  if (searchParams.has('filter')) {
    filters.push(...searchParams.getAll('filter').map((x) => JSON.parse(x)));
  }
  if (searchParams.has('sortKey')) sortKey = searchParams.get('sortKey');
  if (searchParams.has('reverse'))
    reverse = searchParams.get('reverse') === 'true';

  // Only use pagination if sort/filter haven't changed in the current request
  // This prevents "Invalid cursor for current pagination sort" errors
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  const [{collection}] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: {handle, filters, reverse, sortKey, ...paginationVariables},
      // Add other queries here, so that they are loaded in parallel
    }),
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {
    collection,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({context}) {
  return {};
}

export default function Collection() {
  /** @type {LoaderReturnData} */
  const {collection} = useLoaderData();

  return (
    <section className="home-featured-collection collection">
      <div>
        <div className="collection-side-menu">
          <FilterColumns filters={collection?.products?.filters} />
        </div>
      </div>
      <div className="subgrid home-featured-products-grid">
        <h1>{collection.title}</h1>
        <Filter isSearch={false} length={collection.products.nodes.length} />
        <motion.div layout={false}>
          <PAJGination
            products={collection.products}
            handle={collection.handle}
          />
        </motion.div>
      </div>
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </section>
  );
}

export function PAJGination({products, handle, isSearch}) {
  const {endCursor, hasNextPage, hasPreviousPage, startCursor} =
    products.pageInfo;
  const [searchParams] = useSearchParams();

  // Get current sort parameters to preserve them during pagination
  const sortKey = searchParams.get('sortKey') || 'BEST_SELLING';
  const reverse = searchParams.get('reverse') || 'false';
  const filters = searchParams.getAll('filter');
  const search = searchParams.get('q') || '';

  // Build query string with sort/filter params
  const buildPaginationUrl = (cursor, direction) => {
    const params = new URLSearchParams();
    params.set('direction', direction);
    params.set('cursor', cursor);
    params.set('sortKey', sortKey);
    params.set('reverse', reverse);
    filters.forEach((f) => params.append('filter', f));
    if (isSearch) {
      params.set('q', search);
      return `/search?${params.toString()}`;
    }
    return `/collections/${handle}?${params.toString()}`;
  };

  return (
    <>
      <div className="products-grid">
        {products.nodes.map((product, index) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
          />
        ))}
      </div>
      <div className="pagination-links-container">
        <NavLink
          onClick={(e) => {
            if (!hasPreviousPage) e.preventDefault();
          }}
          to={buildPaginationUrl(startCursor, 'previous')}
          className={`pagination-link ${!hasPreviousPage ? 'disabled' : ''}`}
        >
          Previous Page
        </NavLink>
        <div className="line" />
        <NavLink
          onClick={(e) => {
            if (!hasNextPage) e.preventDefault();
          }}
          className={`pagination-link ${!hasNextPage ? 'disabled' : ''}`}
          to={buildPaginationUrl(endCursor, 'next')}
        >
          Next Page
        </NavLink>
      </div>
    </>
  );
}

export const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
    options {
      name
      optionValues {
        name
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
        firstSelectableVariant {
          id
          availableForSale
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
    badgeText: metafield(namespace: "custom", key: "badge_text") {
      value
    }
  }
`;

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
export const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $filters: [ProductFilter!]
    $reverse: Boolean
    $sortKey: ProductCollectionSortKeys
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        filters: $filters,
        reverse: $reverse,
        sortKey: $sortKey
      ) {
        filters{
          id
          label
          presentation
          type
          values{
            count
            id
            input
            label
            swatch{
              color
            }
          }
        }
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
`;

/** @typedef {import('./+types/collections.$handle').Route} Route */
/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
