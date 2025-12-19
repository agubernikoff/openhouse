import {Await, useLoaderData, Link, useRouteLoaderData} from 'react-router';
import React, {Suspense, useState, useRef, useEffect} from 'react';
import {Image} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';
import {COLLECTION_QUERY} from './collections.$handle';
import {motion, AnimatePresence} from 'motion/react';
import normalizeMetaobject from '~/helpers/normalizeMetaobject';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Hydrogen | Home'}];
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
async function loadCriticalData({context}) {
  const [x, partnersData] = await Promise.all([
    context.storefront.query(HERO_QUERY),
    context.storefront.query(PARTNERS_QUERY, {variables: {first: 10}}),
  ]);

  return {
    hero: x.metaobject,
    partners: partnersData.metaobject,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({context}) {
  const featuredCollection = context.storefront
    .query(COLLECTION_QUERY, {
      variables: {
        handle: 'signature-collection',
        first: 12,
      },
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  const collections = context.storefront
    .query(COLLECTIONS_QUERY, {variables: {handle: 'explore-all', first: 6}})
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  const collections2 = context.storefront
    .query(COLLECTIONS_QUERY, {
      variables: {handle: 'copy-of-explore-all', first: 6},
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    featuredCollection,
    collections,
    collections2,
  };
}

export default function Homepage() {
  /** @type {LoaderReturnData} */
  const data = useLoaderData();
  return (
    <div className="home">
      <Hero data={data.hero} />
      <Partners data={data.partners} />
      <FeaturedCollection collection={data.featuredCollection} />
      <CollectionsHero collections={data.collections2} />
      <CollectionGrid collections={data.collections} />
    </div>
  );
}

function Hero({data}) {
  const {publicStoreDomain, header} = useRouteLoaderData('root');
  const {shop} = header;
  const {primaryDomain} = shop;
  const fields = normalizeMetaobject(data);
  const buttonData = JSON.parse(fields?.button_link?.value);
  const url =
    buttonData.url.includes('myshopify.com') ||
    buttonData.url.includes(publicStoreDomain) ||
    buttonData.url.includes(primaryDomain.url)
      ? new URL(buttonData.url).pathname + new URL(buttonData.url).hash
      : buttonData.url;

  const videoRef = useRef(null);

  // Play/pause based on visibility
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch((e) => {
            // autoplay can fail if not muted
            console.warn('Video play failed', e);
          });
        } else {
          video.pause();
        }
      },
      {threshold: 0.1}, // 50% visible triggers play
    );

    observer.observe(video);

    return () => observer.unobserve(video);
  }, []);
  return (
    <section className="hero-section">
      <video
        ref={videoRef}
        src={
          fields.background.reference.sources.find((src) =>
            src.url.includes('.mp4'),
          ).url
        }
        poster={fields.background.reference.previewImage.url}
        loop
        muted
        playsInline
        autoPlay
        preload="auto"
        className="media-element"
      >
        <track kind="captions" />
      </video>
      <h2>
        <em className="rotating-brands-mobile-adj">
          Custom Product Collections
          <br />
          for World Class<span>{' — '}</span>
        </em>
        <RotatingBrandTypes
          types={[
            'Retail',
            'Hospitality & Hotels',
            'Travel & Experiences',
            'Tech & AI',
            'Wellness & Fitness',
            'CPG',
            'Education',
            'Music & Media',
            'Healthcare',
            'Events & Activations',
            'Banking & Finance',
            'F&B',
          ]}
        />
        <span className="rotating-brands-mobile-adj">{' Brands'}</span>
      </h2>
      <div>
        <p>{fields.subtext.value}</p>
        <Link to={url} className="explore-all">
          {buttonData.text.toUpperCase()}
        </Link>
      </div>
    </section>
  );
}

function RotatingBrandTypes({types, interval = 2500}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  const measureRef = useRef(null);

  // Rotate text
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % types.length);
    }, interval);

    return () => clearInterval(id);
  }, [types.length, interval]);

  // Re-measure width whenever text changes
  useEffect(() => {
    if (measureRef.current) {
      const nextWidth = measureRef.current.offsetWidth;
      setWidth(nextWidth);
    }
  }, [index]);

  return (
    <span style={{display: 'inline-flex'}}>
      {'('}
      <motion.span
        style={{
          display: 'inline-block',
          height: '57px',
          width, // 👈 controlled width
          paddingBottom: '5px',
          overflow: 'hidden',
        }}
        animate={{width}} // 👈 auto-animate to measured width
        transition={{
          duration: 0.3,
          ease: 'easeInOut',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={types[index]}
            initial={{y: '-100%'}}
            animate={{y: '0%'}}
            exit={{y: '100%'}}
            transition={{duration: 0.3, ease: 'easeInOut'}}
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              lineHeight: '57px',
            }}
          >
            {types[index]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      {')'}
      {/* Hidden measurer */}
      <span
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {types[index]}
      </span>
    </span>
  );
}

function Partners({data}) {
  const fields = normalizeMetaobject(data);
  const partners = fields?.partners?.references?.nodes || [];

  const renderLogo = (n, i, setIndex) => {
    const fieldz = normalizeMetaobject(n);
    return (
      <div
        className="partner-logo-container"
        key={`${n.id}-set${setIndex}-${i}`}
      >
        <Image
          data={{
            ...fieldz.logo?.reference?.image,
            altText: fieldz?.name?.value,
          }}
          sizes="20vw"
          className="partner-logo"
          loading="eager"
        />
      </div>
    );
  };

  return (
    <section className="home-partners-section">
      <p>WE&rsquo;RE IN GOOD COMPANY</p>

      <div className="partners-carousel-mask">
        <div className="partners-carousel-track">
          <div className="partners-set" aria-hidden="false">
            {partners.map((n, i) => renderLogo(n, i, 0))}
          </div>
          <div className="partners-set" aria-hidden="true">
            {partners.map((n, i) => renderLogo(n, i, 1))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * @param {{
 *   collection: FeaturedCollectionFragment;
 * }}
 */
function FeaturedCollection({collection}) {
  return (
    <section className="home-featured-collection">
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={collection}>
          {(response) => <FeaturedCollectionContent response={response} />}
        </Await>
      </Suspense>
    </section>
  );
}

function FeaturedCollectionContent({response}) {
  const track = useRef(null);
  const item = useRef(null);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);

  const products = response?.collection?.products?.nodes ?? [];
  const visibleCount = 3;
  const maxIndex = products.length - visibleCount;

  useEffect(() => {
    if (!item.current) return;

    const itemWidth = item.current.getBoundingClientRect().width;
    const gap = 20;
    setOffset(index * (itemWidth + gap));
  }, [index]);

  function next() {
    setIndex((i) => Math.min(i + 1, maxIndex));
  }

  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <>
      <div>
        <p className="red-dot">FEATURED</p>
      </div>
      <div className="subgrid home-featured-products-grid">
        <h3>{response.collection.description}</h3>
        <div className="carousel-wrapper">
          <div className="carousel-viewport">
            <div
              className="carousel-track"
              ref={track}
              style={{transform: `translateX(-${offset}px)`}}
            >
              {products.map((product, i) => (
                <div
                  className="carousel-item"
                  key={product.id}
                  ref={i === 0 ? item : null}
                >
                  <ProductItem product={product} loading="eager" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="featured-products-button-container">
          <Link
            to={`/collections/${response.collection.handle}`}
            className="explore-all"
          >
            EXPLORE ALL
          </Link>
          <div>
            <button
              className="carousel-btn left"
              onClick={prev}
              disabled={index === 0}
            >
              <svg
                width="32"
                height="15"
                viewBox="0 0 32 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0.292892 8.07112C-0.0976295 7.6806 -0.0976295 7.04743 0.292892 6.65691L6.65685 0.292946C7.04738 -0.0975785 7.68054 -0.0975785 8.07107 0.292946C8.46159 0.68347 8.46159 1.31664 8.07107 1.70716L2.41421 7.36401L8.07107 13.0209C8.46159 13.4114 8.46159 14.0446 8.07107 14.4351C7.68054 14.8256 7.04738 14.8256 6.65685 14.4351L0.292892 8.07112ZM32 7.36401V8.36401H1V7.36401V6.36401H32V7.36401Z"
                  fill="#2D2D2B"
                />
              </svg>
            </button>
            <button
              className="carousel-btn right"
              onClick={next}
              disabled={index === maxIndex}
            >
              <svg
                width="32"
                height="15"
                viewBox="0 0 32 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M31.7071 8.07112C32.0976 7.6806 32.0976 7.04743 31.7071 6.65691L25.3431 0.292946C24.9526 -0.0975785 24.3195 -0.0975785 23.9289 0.292946C23.5384 0.68347 23.5384 1.31664 23.9289 1.70716L29.5858 7.36401L23.9289 13.0209C23.5384 13.4114 23.5384 14.0446 23.9289 14.4351C24.3195 14.8256 24.9526 14.8256 25.3431 14.4351L31.7071 8.07112ZM0 7.36401V8.36401H31V7.36401V6.36401H0V7.36401Z"
                  fill="#2D2D2B"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * @param {{
 *   products: Promise<RecommendedProductsQuery | null>;
 * }}
 */
function CollectionGrid({collections}) {
  return (
    <section className="home-featured-collection">
      <div>
        <p className="red-dot">CATEGORIES</p>
      </div>
      <div className="subgrid home-featured-products-grid">
        {/* <h3>Explore Categories</h3> */}
        <Suspense fallback={<div>Loading...</div>}>
          <Await resolve={collections}>
            {(r) => {
              const fields = normalizeMetaobject(r.metaobject);
              return (
                <div className="home-collections-grid">
                  {fields?.collections?.references?.nodes?.map((coll) => (
                    <div className="collection-grid-item" key={coll.id}>
                      <Link to={`/collections/${coll.handle}`}>
                        <Image
                          data={coll.image}
                          sizes="(min-width: 500px) 30vw, 100vw"
                        />
                        <p>{coll.title}</p>
                      </Link>
                    </div>
                  ))}
                  <div>
                    <p>{fields?.blurb?.value}</p>
                    <Link className="explore-all" to={`collections/frontpage`}>
                      {fields?.button_text?.value}
                    </Link>
                  </div>
                </div>
              );
            }}
          </Await>
        </Suspense>
      </div>
    </section>
  );
}

function CollectionsHero({collections}) {
  return (
    <section className="home-collections-hero">
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={collections}>
          {(r) => <CollectionsHeroContent data={r} />}
        </Await>
      </Suspense>
    </section>
  );
}

function CollectionsHeroContent({data}) {
  const fields = normalizeMetaobject(data.metaobject);
  const collectionNodes = fields?.collections?.references?.nodes || [];
  const [selected, setSelected] = useState(collectionNodes[0]);

  return (
    <>
      <AnimatePresence mode="popLayout">
        <motion.div
          style={{width: '100%', height: '100%'}}
          key={selected?.id}
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
        >
          {selected && <Image data={selected?.image} sizes="100vw" />}
        </motion.div>
      </AnimatePresence>
      <div className="home-collections-hero-titles-container">
        <p>{fields?.blurb?.value}</p>
        {collectionNodes.map((coll) => (
          <Link
            to={`/collections/${coll.handle}`}
            key={coll.id}
            onMouseEnter={() => setSelected(coll)}
          >
            <p>{coll.title}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {import('storefrontapi.generated').FeaturedCollectionFragment} FeaturedCollectionFragment */
/** @typedef {import('storefrontapi.generated').RecommendedProductsQuery} RecommendedProductsQuery */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */

const HERO_QUERY = `#graphql
query GetLocationVideos {
  metaobject(
    handle: {
      type: "hero_section"
      handle: "hero-section-gaf0wq6b"}
  ) {
    id
    type
    handle
    fields {
      key
      value
      reference {
        __typename
        ... on MediaImage {
          image {
            url
            id
            height
            width
          }
        }
        ... on Video {
          sources {
            url
            mimeType
          }
          previewImage {
            url
          }
        }
      }
    }
  }
}
`;

const COLLECTIONS_QUERY = `#graphql
query GetLocationVideos($handle: String!, $first: Int) {
  metaobject(
    handle: {
      type: "homepage_collection_grid"
      handle: $handle}
  ) {
    id
    type
    handle
    fields {
      key
      value
      references(first: $first) {
        nodes{
          ... on Collection{
            id
            handle
            title
            image{
              id
              altText
              width
              height
              url
            }
          }
        }
      }
    }
  }
}
`;

export const PARTNERS_QUERY = `#graphql
query GetLocationVideos($first: Int) {
  metaobject(
    handle: {
      type: "partners"
      handle: "partners-atsdwhs9"}
  ) {
    id
    type
    handle
    fields {
      key
      value
      references(first: $first) {
        nodes{
          ... on Metaobject{
            id
            fields{
              key
              value
              reference{
                ... on MediaImage {
                  image {
                    id
                    url
                    height
                    width
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
