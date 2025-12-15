import {useLoaderData, Link, Await} from 'react-router';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Image,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import React, {
  useState,
  useEffect,
  Suspense,
  useRef,
  startTransition,
} from 'react';
import normalizeMetaobject from '~/helpers/normalizeMetaobject';
import Expandable from '~/components/Expandable';
import mapRichText from '~/helpers/mapRichText';
import {PRODUCT_ITEM_FRAGMENT} from './collections.$handle';
import {ProductItem} from '~/components/ProductItem';
import {FilterInput} from '~/components/Filter';
import {AnimatePresence, motion} from 'motion/react';
import {useNavigationContext} from '~/context/NavigationContext';
import {useCascadingSelection} from '~/hooks/useCascadingSelection';

function useIsFirstRender() {
  const isFirst = useRef(true);
  useEffect(() => {
    isFirst.current = false;
  }, []);
  return isFirst.current;
}

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
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

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({context, params}) {
  const {storefront} = context;
  const {handle} = params;
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.
  const faqs = storefront.query(FAQ_QUERY);
  const recs = storefront.query(PRODUCT_RECOMENDATIONS_QUERY, {
    variables: {handle},
  });
  const compliments = storefront.query(COMPLEMENTARY_QUERY, {
    variables: {handle},
  });
  return {faqs, recs, compliments};
}

export default function Product() {
  /** @type {LoaderReturnData} */
  const {product, faqs, recs, compliments} = useLoaderData();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  // Reorder options: Color and Embellishment Type first
  const optionOrder = ['Color', 'Embellishment Type', 'Order Type'];
  const reorderedOptions = [...productOptions].sort((a, b) => {
    const indexA = optionOrder.indexOf(a.name);
    const indexB = optionOrder.indexOf(b.name);

    // If not in optionOrder array, push to end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  const {title, descriptionHtml} = product;
  const [selectedImage, setSelectedImage] = useState(selectedVariant?.image);

  useEffect(() => {
    setSelectedImage(selectedVariant.image);
  }, [selectedVariant]);

  const {lastCollectionPath} = useNavigationContext();

  function capitalizeFirstLetter(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  function formatCollectionTitle(slug) {
    if (!slug) return '';
    const cleaned = slug.replace(/-1$/, '').replace(/-/g, ' ');
    return cleaned
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Prefer a non-"New Arrivals" collection if available
  const notNewArrivalsCollection = product.collections?.nodes.find(
    (col) => col.title !== 'New Arrivals',
  );

  // Determine if lastCollectionPath is a valid collection path
  const isValidCollectionPath = lastCollectionPath?.includes('/collections/');

  // Choose the fallback collection if needed
  const fallbackCollection =
    notNewArrivalsCollection || product.collections?.nodes[0];

  // Final path for breadcrumb
  const to = isValidCollectionPath
    ? lastCollectionPath
    : `/collections/${fallbackCollection?.handle}`;

  return (
    <>
      <div className="product">
        <div className="product-images-gallery">
          <div className="product-image-previews-container">
            {product.images.nodes
              .filter((img) => {
                if (selectedVariant?.image.altText && img.altText)
                  return img.altText === selectedVariant.image.altText;
                else return true;
              })
              .map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  style={{
                    border:
                      selectedImage?.id === img.id
                        ? '1px solid var(--color-oh-black)'
                        : '1px solid var(--color-oh-gray)',
                    transition: 'border 200ms ease-in-out',
                  }}
                >
                  <ProductImage image={img} />
                </button>
              ))}
          </div>
          {product.images.nodes.map((img) => (
            <ProductImage key={img.id} image={img} hidden />
          ))}
          <ProductImage image={selectedImage} />
        </div>
        <div className="product-main">
          <div className="product-main-details">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link style={{color: '#BFC0C1'}} to="/collections/frontpage">
                Categories
              </Link>
              <svg
                className="breadcrumb-separator"
                width="32"
                height="2"
                viewBox="0 0 32 2"
                style={{
                  margin: '0 16px',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
                aria-hidden="true"
              >
                <line
                  x1="0"
                  y1="1"
                  x2="32"
                  y2="1"
                  stroke="#BFC0C1"
                  strokeWidth="1.5"
                />
              </svg>
              <Link className="crumb" to={to}>
                {to.includes('new-arrivals')
                  ? 'New Arrivals'
                  : to.includes('best-sellers')
                    ? 'Best Sellers'
                    : to.includes('frontpage')
                      ? 'All Products'
                      : formatCollectionTitle(to.split('/collections/')[1])}
              </Link>
            </nav>
            <p className="product-title">{title}</p>
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
            />
            <div
              className="product-description"
              dangerouslySetInnerHTML={{__html: descriptionHtml}}
            />
          </div>
          <ProductForm
            productOptions={reorderedOptions}
            selectedVariant={selectedVariant}
          />
        </div>
        <Analytics.ProductView
          data={{
            products: [
              {
                id: product.id,
                title: product.title,
                price: selectedVariant?.price.amount || '0',
                vendor: product.vendor,
                variantId: selectedVariant?.id || '',
                variantTitle: selectedVariant?.title || '',
                quantity: 1,
              },
            ],
          }}
        />
      </div>
      <AdditionalInfo product={product} />
      <FAQSection data={faqs} />
      <YouMayAlsoLike recs={recs} compliments={compliments} />
    </>
  );
}

function AdditionalInfo({product}) {
  const {lead_time, material, size_chart} = product;

  const measuredRef = useRef(null);
  const initial = useRef(null);
  const initialHeight = useRef(0);
  const sectionRef = useRef(null);
  const imageRef = useRef(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const options = [
    'LEAD TIME',
    'MATERIAL',
    'SIZE CHART',
    'OUR COMMITMENT',
    'RETURNS',
  ];

  const {selected, transitioning, handleSelection, isChecked} =
    useCascadingSelection(options, 'LEAD TIME');

  useEffect(() => {
    if (!measuredRef.current || !initial.current) return;
    const display = window.getComputedStyle(sectionRef.current).display;
    const h =
      display === 'flex'
        ? measuredRef.current.scrollHeight +
            imageRef.current.scrollHeight +
            initial.current.scrollHeight +
            56 || 0
        : measuredRef.current.scrollHeight || 0;
    // Ensure height doesn't go below initial height
    const finalHeight = Math.max(h, initialHeight.current);
    try {
      startTransition(() => setMeasuredHeight(finalHeight));
    } catch (e) {
      setMeasuredHeight(finalHeight);
    }
  }, [selected]);

  useEffect(() => {
    if (!initial.current) return;

    // Capture initial height on mount
    initialHeight.current = initial.current.scrollHeight;
    setMeasuredHeight(initialHeight.current);

    if (!measuredRef.current || typeof ResizeObserver === 'undefined') return;
    const el = measuredRef.current;
    const ro = new ResizeObserver(() => {
      const display = window.getComputedStyle(sectionRef.current).display;
      const h =
        display === 'flex'
          ? measuredRef.current.scrollHeight +
              imageRef.current.scrollHeight +
              initial.current.scrollHeight +
              56 || 0
          : measuredRef.current.scrollHeight || 0;
      // Ensure height doesn't go below initial height
      const finalHeight = Math.max(h, initialHeight.current);
      try {
        startTransition(() => setMeasuredHeight(finalHeight));
      } catch (e) {
        setMeasuredHeight(finalHeight);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const btns = options.map((x) => (
    <FilterInput
      key={x}
      label={x}
      isChecked={isChecked}
      value={x}
      addFilter={() => handleSelection(x)}
      removeFilter={() => null}
      isTransitioning={transitioning.has(x)}
      columnKey={'x'}
    />
  ));

  function content() {
    switch (selected) {
      case 'LEAD TIME':
        return lead_time?.value
          ? mapRichText(JSON.parse(lead_time?.value))
          : null;
      case 'MATERIAL':
        return material?.value
          ? mapRichText(JSON.parse(material?.value))
          : null;
      case 'SIZE CHART':
        return (
          <Image
            data={size_chart?.reference?.image}
            sizes="(min-width: 45em) 45vw, 100vw"
          />
        );
      default:
        return null;
    }
  }

  return (
    <motion.section
      className="home-featured-collection pdp-additional-info-section"
      initial={{height: 'auto'}}
      animate={{height: measuredHeight > 0 ? measuredHeight : 'auto'}}
      ref={sectionRef}
    >
      <div className="filter-column-container" ref={initial}>
        {btns}
      </div>
      <div className="pdp-additional-info-content-container">
        <AnimatePresence mode="popLayout">
          <div ref={measuredRef}>
            <motion.div
              key={selected}
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
            >
              <Image
                data={size_chart?.reference?.image}
                sizes="(min-width: 45em) 45vw, 100vw"
              />
              {content()}
            </motion.div>
          </div>
        </AnimatePresence>
      </div>
      <div ref={imageRef}>
        <img alt="" src="" className="pdp-additional-info-image" />
      </div>
    </motion.section>
  );
}

function FAQSection({data}) {
  const isFirstRender = useIsFirstRender();
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };
  return (
    <section className="home-featured-collection">
      <div>
        <p className="red-dot">FREQUENTLY ASKED QUESTIONS</p>
      </div>
      <div>
        <Suspense fallback={<div>Loading...</div>}>
          <Await resolve={data}>
            {(faq) => {
              const {faqs} = normalizeMetaobject(faq.metaobject);

              return faqs.references.nodes.map((field) => {
                const {question, answer} = normalizeMetaobject(field);
                return (
                  <Expandable
                    key={field.id}
                    openSection={openSection}
                    toggleSection={toggleSection}
                    title={question.value}
                    details={mapRichText(JSON.parse(answer.value))}
                    isFirstRender={isFirstRender}
                  />
                );
              });
            }}
          </Await>
        </Suspense>
      </div>
    </section>
  );
}

function YouMayAlsoLike({compliments, recs}) {
  const [resolvedCompliments, setResolvedCompliments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([compliments, recs])
      .then(([complimentsRes, recsRes]) => {
        const complimentsData = complimentsRes?.productRecommendations || [];
        const recsData = recsRes?.productRecommendations || [];

        const uniqueProducts = [
          ...new Map(
            [...complimentsData, ...recsData]
              .filter((p) => p?.id)
              .map((p) => [p.id, p]),
          ).values(),
        ].slice(0, 4);

        setResolvedCompliments(uniqueProducts);
      })
      .finally(() => setLoading(false));
  }, [compliments, recs]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <section className="home-featured-collection you-may-also-like">
      <div>
        <p className="red-dot">YOU MAY ALSO LIKE</p>
      </div>
      <div className="subgrid products-grid">
        {resolvedCompliments.map((product, index) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
          />
        ))}
      </div>
    </section>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
      minimumQuantity: metafield(namespace: "custom", key: "minimum_quantity") {
        value
      }
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
    minimumQuantity: metafield(namespace: "custom", key: "variant_minimum_quantity_priority") {
      value
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
    collections(first:2){
      nodes{
        handle
        title
      }
    }
    images(first: 30) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    lead_time: metafield(namespace: "custom", key: "lead_time") {
      value
    }
    material: metafield(namespace: "custom", key: "material") {
      value
    }
    size_chart: metafield(namespace: "custom", key: "size_chart") {
      reference{
        ... on MediaImage {
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
    minimumQuantity: metafield(namespace: "custom", key: "minimum_quantity") {
      value
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;

/** @typedef {import('./+types/products.$handle').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */

export const FAQ_QUERY = `#graphql
query GetFAQ() {
  metaobject(
    handle: {
      type: "faq_section"
      handle: "faq-section-xp0vokbs"}
  ) {
    id
    type
    handle
    fields {
      key
      value
      references(first: 50) {
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

const PRODUCT_RECOMENDATIONS_QUERY = `
${PRODUCT_ITEM_FRAGMENT}
#graphql
query MyQuery(
$country: CountryCode
$handle: String!
$language: LanguageCode
) @inContext(country: $country, language: $language) {
  productRecommendations(intent: RELATED, productHandle: $handle) {
    ...ProductItem
  }
}`;

const COMPLEMENTARY_QUERY = `${PRODUCT_ITEM_FRAGMENT}
#graphql
query MyQuery(
$country: CountryCode
$handle: String!
$language: LanguageCode
) @inContext(country: $country, language: $language) {
  productRecommendations(intent: COMPLEMENTARY, productHandle: $handle) {
    ...ProductItem
  }
}`;
