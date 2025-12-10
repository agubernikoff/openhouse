import {Link, useLoaderData} from 'react-router';
import {getPaginationVariables, Image, Pagination} from '@shopify/hydrogen';
import dispatch from '../assets/dispatch.svg';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: `Hydrogen | Dispatch`}];
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
    pageBy: 10,
  });

  const [{articles}] = await Promise.all([
    context.storefront.query(ARTICLES_QUERY, {
      variables: {
        ...paginationVariables,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {articles};
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
  const {articles} = useLoaderData();

  return (
    <>
      <section className="dispatch-hero">
        <div className="dispatch-hero-content">
          <div className="dispatch-hero-text">
            <p className="dispatch-hero-label">THE DISPATCH</p>
            <h1 className="dispatch-hero-title">
              Notes on taste, product culture, and brand expression.
            </h1>
            <p className="dispatch-hero-description">
              Help us share the big industry product of every made custom
              products by optimizing with OpenHouse.
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
          <p className="red-dot">DISPATCH</p>
        </div>
        <Pagination connection={articles}>
          {({nodes, isLoading, PreviousLink, NextLink}) => (
            <>
              <PreviousLink>
                {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
              </PreviousLink>
              <div className="subgrid home-featured-products-grid dispatch-articles-grid">
                {nodes.map((article, index) => (
                  <Link
                    className="dispatch-article-card"
                    key={article.handle}
                    prefetch="intent"
                    to={`/blogs/${article.blog.handle}/${article.handle}`}
                  >
                    {article.image && (
                      <div className="dispatch-article-image">
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
              <NextLink>
                {isLoading ? 'Loading...' : <span>Load more ↓</span>}
              </NextLink>
            </>
          )}
        </Pagination>
      </section>
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

/** @typedef {ArticlesQuery['articles']['nodes'][0]} ArticleNode */

/** @typedef {import('./+types/dispatch').Route} Route */
/** @typedef {import('storefrontapi.generated').ArticlesQuery} ArticlesQuery */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
