import {useLoaderData} from 'react-router';
import normalizeMetaobject from '~/helpers/normalizeMetaobject';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {Image} from '@shopify/hydrogen';
import {AnimatePresence, motion, useScroll, useTransform} from 'motion/react';
import {useState, useEffect, useRef} from 'react';
import mapRichText from '~/helpers/mapRichText';

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
      case 'marquee':
        return <Marquee section={section} key={section.id} />;
      case 'hero_section':
        return <PageHero section={section} key={section.id} />;
      default:
        return null;
    }
  });
  return <main>{mapped}</main>;
}

function PageHero({section}) {
  const {background, headline} = normalizeMetaobject(section);

  return (
    <section className="hero-section">
      <Image data={background.reference.image} sizes="100vw" />
      <div>
        <svg
          width="66"
          height="28"
          viewBox="0 0 66 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M65.0455 0.440001C65.0455 0.440001 13.3597 0 13.0581 0C5.48226 0 0 5.72355 0 13.5815C0 21.4394 5.48048 27.1629 13.0581 27.1629C20.6356 27.1629 26.1161 21.4411 26.1161 13.5815C26.1161 10.9663 25.5058 8.59064 24.4182 6.58226L36.7542 6.67274V21.2495C36.7542 21.6469 37.0753 21.9681 37.4727 21.9681H42.3624C42.7598 21.9681 43.081 21.6469 43.081 21.2495V18.5066C43.081 18.1092 43.4021 17.7881 43.7995 17.7881H53.3074C53.7048 17.7881 54.026 18.1092 54.026 18.5066V21.6913C54.026 22.0887 54.3471 22.4098 54.7445 22.4098H59.6342C60.0316 22.4098 60.3527 22.0887 60.3527 21.6913V6.75258L65.0402 6.76145C65.4731 6.765 65.8261 6.41371 65.8261 5.98258V1.22065C65.8261 0.789516 65.4766 0.440001 65.0455 0.440001ZM13.0581 21.3595C9.14952 21.3595 6.28774 18.0152 6.28774 13.5016C6.28774 8.98806 9.14952 5.64194 13.0581 5.64194C16.9666 5.64194 19.8284 8.90645 19.8284 13.5016C19.8284 18.0968 16.9666 21.3595 13.0581 21.3595ZM54.026 11.9403C54.026 12.3377 53.7048 12.6589 53.3074 12.6589H43.7995C43.4021 12.6589 43.081 12.3377 43.081 11.9403V6.71887L54.0242 6.74016V11.9403H54.026Z"
            fill="#F4F2EA"
          />
        </svg>
        {mapRichText(JSON.parse(headline.value))}
      </div>
    </section>
  );
}

function Marquee({section}) {
  const images = section.fields[0].references.nodes;
  const containerRef = useRef(null);
  const {scrollYProgress} = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const percentHidden = (100 / (images.length * 42) - 1) * 100;
  // Map scroll progress to horizontal scroll: 0% visible = 0% scroll, 100% visible = 100% scroll
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `${percentHidden}%`]);

  return (
    <section className="marquee-section" ref={containerRef}>
      <motion.div style={{x}}>
        {images.map((i) => (
          <Image
            key={i.id}
            data={i.image}
            sizes="(min-width: 767px) 30vw, 100vw"
          />
        ))}
      </motion.div>
    </section>
  );
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
