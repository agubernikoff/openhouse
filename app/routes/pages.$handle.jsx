import {useLoaderData} from 'react-router';
import normalizeMetaobject from '~/helpers/normalizeMetaobject';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {Image} from '@shopify/hydrogen';
import {AnimatePresence, motion} from 'motion/react';
import {useState, useEffect, useRef} from 'react';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `Hydrogen | ${data?.page.title ?? ''}`}];
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
async function loadCriticalData({context, request, params}) {
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const [{page}] = await Promise.all([
    context.storefront.query(PAGE_QUERY, {
      variables: {
        handle: params.handle,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!page) {
    throw new Response('Not Found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});

  return {
    page,
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

export default function Page() {
  /** @type {LoaderReturnData} */
  const {page} = useLoaderData();

  return (
    <div className="page">
      {page.hide_title?.value !== 'true' && (
        <header>
          <h1>{page.title}</h1>
        </header>
      )}
      {page.sections ? (
        <Sections sections={page.sections?.references?.nodes} />
      ) : (
        <main dangerouslySetInnerHTML={{__html: page.body}} />
      )}
    </div>
  );
}

export function Sections({sections}) {
  const mapped = sections.map((section) => {
    // console.log(section.type);
    switch (section.type) {
      case 'partners':
        return <Partners section={section} key={section.id} />;
    }
  });
  return <main>{mapped}</main>;
}

function Partners({section}) {
  const {header, partners} = normalizeMetaobject(section);

  const allPartners = partners.references.nodes;
  const [displayed, setDisplayed] = useState(() => allPartners.slice(0, 20));
  const leftoverRef = useRef(allPartners.slice(20));
  const stagingRef = useRef([]);
  const isPullingFromLeftoverRef = useRef(true);
  const lastReplacedIndexRef = useRef(null);

  // Visibility / viewport control
  const containerRef = useRef(null);
  const [isOnScreen, setIsOnScreen] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document !== 'undefined'
      ? document.visibilityState === 'visible'
      : true,
  );

  // IntersectionObserver: track whether container is visible in viewport
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsOnScreen(entry.isIntersecting);
        });
      },
      {threshold: 0.1},
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef]);

  // Page visibility (tab hidden) handling
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Rotation interval: only run when container is on screen AND tab is visible
  useEffect(() => {
    if (!isOnScreen || !isTabVisible) return;

    const interval = setInterval(() => {
      setDisplayed((prev) => {
        const newDisplayed = [...prev];
        // Pick random index to replace, but avoid the last replaced index
        let randomIndex;
        let attempts = 0;
        do {
          randomIndex = Math.floor(Math.random() * newDisplayed.length);
          attempts += 1;
        } while (randomIndex === lastReplacedIndexRef.current && attempts < 10);
        lastReplacedIndexRef.current = randomIndex;
        const removedNode = newDisplayed[randomIndex];

        // Determine which bucket to pull from
        let replacement = null;
        // If currently pulling from leftover
        if (isPullingFromLeftoverRef.current) {
          if (leftoverRef.current.length > 0) {
            replacement = leftoverRef.current.shift();
          } else if (stagingRef.current.length > 0) {
            // Switch to staging only when leftover is empty
            isPullingFromLeftoverRef.current = false;
            replacement = stagingRef.current.shift();
          }
        } else {
          // Currently pulling from staging
          if (stagingRef.current.length > 0) {
            replacement = stagingRef.current.shift();
          } else if (leftoverRef.current.length > 0) {
            // Switch back to leftover only when staging is empty
            isPullingFromLeftoverRef.current = true;
            replacement = leftoverRef.current.shift();
          }
        }

        // If we have a replacement, swap it in and store removed node
        if (replacement) {
          newDisplayed[randomIndex] = replacement;
          // Store removed node in the bucket we just pulled from
          if (isPullingFromLeftoverRef.current) {
            stagingRef.current.push(removedNode);
          } else {
            leftoverRef.current.push(removedNode);
          }
        }
        return newDisplayed;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isOnScreen, isTabVisible]);

  const renderLogo = (n, i) => {
    const fieldz = normalizeMetaobject(n);
    return (
      <div style={{overflow: 'hidden'}} key={n.id + '-' + i}>
        <motion.div
          initial={{opacity: 0, y: 100}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -100}}
          transition={{ease: [0.77, 0.03, 0.94, 0.74], duration: 0.6}}
          key={n.id + '-' + i}
          style={{width: '100%', height: '100%'}}
        >
          <Image
            data={{
              ...fieldz.logo?.reference?.image,
              altText: fieldz?.name?.value,
            }}
            sizes="100vw"
            className="partner-logo"
          />
        </motion.div>
      </div>
    );
  };

  return (
    <section className="home-featured-collection">
      <div>
        <p className="red-dot">PARTNERS</p>
      </div>
      <div className="subgrid home-featured-products-grid">
        <h3>{header.value}</h3>
      </div>
      <div className="partners-wall-container" ref={containerRef}>
        <AnimatePresence mode="popLayout">
          {displayed.map(renderLogo)}
        </AnimatePresence>
      </div>
    </section>
  );
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
      hide_title:metafield(key: "hide_title", namespace: "custom"){
        value
      }
      sections:metafield(key: "sections", namespace: "custom") {
        references(first: 10) {
          nodes {
            ... on Metaobject {
              type
              id
              fields {
                type
                value
                key
                reference{
                  ...on MediaImage{
                    id
                    __typename
                    image{
                      url
                      height
                      id
                      width
                      altText
                    }
                  }
                }
                references(first: 200) {
                  nodes {
                    ... on Metaobject {
                      id
                      fields {
                        value
                        key
                        reference {
                          ... on MediaImage {
                            id
                            __typename
                            image {
                              url
                              height
                              id
                              width
                              altText
                            }
                          }
                        }
                        type
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** @typedef {import('./+types/pages.$handle').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
