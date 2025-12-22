import {Link, useLoaderData} from 'react-router';
import {getPaginationVariables, Image, Pagination} from '@shopify/hydrogen';
import dispatch from '../assets/dispatch.svg';
import {useRef} from 'react';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: `Openhouse | Dispatch`}];
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
async function loadCriticalData({context, request}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  const [{articles}, {metaobject}] = await Promise.all([
    context.storefront.query(ARTICLES_QUERY, {
      variables: {
        ...paginationVariables,
      },
    }),
    context.storefront.query(DISPATCH_QUERY),
  ]);

  return {
    articles,
    dispatchData: metaobject,
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

export default function Dispatch() {
  /** @type {LoaderReturnData} */
  const {articles, dispatchData} = useLoaderData();

  const dispatchTitle = dispatchData?.fields?.find(
    (field) => field.key === 'dispatch_title',
  )?.value;

  const dispatchBlurb = dispatchData?.fields?.find(
    (field) => field.key === 'dispatch_blurb',
  )?.value;

  return (
    <>
      <section className="dispatch-hero">
        <div className="dispatch-hero-content">
          <div className="dispatch-hero-text">
            <p className="dispatch-hero-label">THE DISPATCH</p>
            <h1 className="dispatch-hero-title">
              {dispatchTitle ||
                'Notes on taste, product culture, and brand expression.'}
            </h1>
            <p className="dispatch-hero-description">
              {dispatchBlurb ||
                'The inner circle of Openhouse: fresh ideas, elevated designs, and brand stories that stick.'}
            </p>
            <Link className="explore-all" to={`/contact`}>
              GET IN CONTACT
            </Link>
          </div>
          <div className="dispatch-hero-logo">
            <img src={dispatch} alt="The Dispatch" />
          </div>
        </div>
      </section>

      <section className="home-featured-collection dispatch-articles-section">
        <div>
          <p className="red-dot">THE DISPATCH</p>
        </div>
        <div id="blogs">
          <BlogsPAJGination products={articles} />
        </div>
      </section>
    </>
  );
}

export function BlogsPAJGination({products}) {
  const {endCursor, hasNextPage, hasPreviousPage, startCursor} =
    products.pageInfo;

  const gridRef = useRef(null);

  // Build query string with sort/filter params
  const buildPaginationUrl = (cursor, direction) => {
    const params = new URLSearchParams();
    params.set('direction', direction);
    params.set('cursor', cursor);
    return `/blogs?${params.toString()}`;
  };

  const handlePaginationClick = (e, hasPage) => {
    if (!hasPage) {
      e.preventDefault();
      return;
    }

    // Smooth scroll to 1rem above the products grid
    if (gridRef.current) {
      const elementTop = gridRef.current.getBoundingClientRect().top;
      const remInPixels = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const scrollPosition = window.scrollY + elementTop - remInPixels;

      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <>
      <div className="products-grid" ref={gridRef}>
        {products.nodes.map((article, index) => (
          <Link
            className="product-item"
            key={article.handle}
            prefetch="intent"
            to={`/blogs/${article.blog.handle}/${article.handle}`}
          >
            {article.image && (
              <div className="product-image-container">
                <Image
                  alt={article.image.altText || article.title}
                  aspectRatio="1/1"
                  data={article.image}
                  sizes="(min-width: 45em) 20vw, 50vw"
                />
              </div>
            )}
            <h3 className="dispatch-article-title">{article.title}</h3>
          </Link>
        ))}
      </div>
      <div className="pagination-links-container">
        <Link
          onClick={(e) => handlePaginationClick(e, hasPreviousPage)}
          to={buildPaginationUrl(startCursor, 'previous')}
          className={`pagination-link ${!hasPreviousPage ? 'disabled' : ''}`}
          preventScrollReset
        >
          Previous Page
        </Link>
        <div className="line" />
        <Link
          onClick={(e) => handlePaginationClick(e, hasNextPage)}
          className={`pagination-link ${!hasNextPage ? 'disabled' : ''}`}
          to={buildPaginationUrl(endCursor, 'next')}
          preventScrollReset
        >
          Next Page
        </Link>
      </div>
    </>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/article
const ARTICLES_QUERY = `#graphql
  query Articles(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    articles(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor,
      sortKey: PUBLISHED_AT,
      reverse: true
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        id
        title
        handle
        publishedAt
        image {
          id
          altText
          url
          width
          height
        }
        blog {
          handle
        }
        seo {
          title
          description
        }
      }
    }
  }
`;

const DISPATCH_QUERY = `#graphql
  query DispatchMetaobject {
    metaobject(handle: {type: "auw_dispatch", handle: "auw-dispatch-yyrirgxq"}) {
      fields {
        key
        value
      }
    }
  }
`;

/** @typedef {ArticlesQuery['articles']['nodes'][0]} ArticleNode */

/** @typedef {import('./+types/dispatch').Route} Route */
/** @typedef {import('storefrontapi.generated').ArticlesQuery} ArticlesQuery */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
