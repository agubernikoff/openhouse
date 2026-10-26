import {isPortalProduct} from '~/lib/portalProducts';

/**
 * Corrects the tag facet ("Categories") so franchise portal products don't
 * leak into main-site filters: removes `portal:*` values and recounts values
 * without portal products (plan §4.4).
 *
 * Why recount instead of subtracting: Shopify's tag facet is multi-select,
 * so its counts ignore the selection within the tag group — a portal-only
 * query returns the same tag counts as the unfiltered one. Search facet
 * counts also aren't plain product counts. So the affected counts are
 * recomputed from the products themselves.
 *
 * Only does extra work when a `portal:*` value is present, i.e. portal
 * products are actually in the result; otherwise Shopify's counts are right.
 *
 * @param {{
 *   filters: Filter[] | null | undefined;
 *   selected: Record<string, unknown>[];
 *   fetchProducts: (filters: Record<string, unknown>[]) => Promise<{id: string; tags: string[]}[]>;
 * }} args
 *   - `selected`: the ProductFilter inputs applied to the original query
 *   - `fetchProducts`: re-runs the original collection/search query with the
 *     given filters, returning up to 250 products with `id` and `tags`
 * @return {Promise<Filter[] | null | undefined>}
 */
export async function correctFacetsForPortals({
  filters,
  selected,
  fetchProducts,
}) {
  const tagFacet = filters?.find((f) => f.id === TAG_FACET_ID);
  if (!tagFacet?.values.some(isPortalValue)) return filters;

  // Tag counts ignore tag selections, so recount against the non-tag filters
  const nonTagFilters = selected.filter((f) => !('tag' in f));
  const countWithout = async (extraFilter) => {
    const products = await fetchProducts(
      extraFilter ? [...nonTagFilters, extraFilter] : nonTagFilters,
    );
    return products.filter((p) => !isPortalProduct(p));
  };

  const base = await countWithout(null);
  const values = await Promise.all(
    tagFacet.values
      .filter((value) => !isPortalValue(value))
      .map(async (value) => {
        const input = parseInput(value);
        const tag = typeof input?.tag === 'string' ? input.tag : null;
        if (!tag) return value;

        // Search & Discovery value groups (e.g. "headwear" covering several
        // spellings) can't be matched by tag name; ask Shopify for members
        const count = tag.startsWith(VALUE_GROUP_PREFIX)
          ? (await countWithout(input)).length
          : base.filter((p) => hasTag(p, tag)).length;

        return {...value, count};
      }),
  );

  return filters.map((f) =>
    f === tagFacet ? {...f, values: values.filter((v) => v.count > 0)} : f,
  );
}

/**
 * Whether portal products are in a result, judged from its raw tag facet
 * (which lists every tag in the result, ignoring tag selections).
 * @param {Filter[] | null | undefined} filters
 */
export function facetsIncludePortalProducts(filters) {
  const tagFacet = filters?.find((f) => f.id === TAG_FACET_ID);
  return !!tagFacet?.values.some(isPortalValue);
}

/**
 * On a portal's own catalog every product carries the portal tag, so counts
 * are right; just hide the `portal:*` value itself.
 * @param {Filter[] | null | undefined} filters
 */
export function withoutPortalFacetValues(filters) {
  return filters?.map((f) =>
    f.id === TAG_FACET_ID
      ? {...f, values: f.values.filter((v) => !isPortalValue(v))}
      : f,
  );
}

const TAG_FACET_ID = 'filter.p.tag';
const VALUE_GROUP_PREFIX = 'gid://shopify/FilterSettingGroup/';

function parseInput(value) {
  try {
    return JSON.parse(value.input);
  } catch {
    return null;
  }
}

function isPortalValue(value) {
  const tag = parseInput(value)?.tag;
  return typeof tag === 'string' && tag.startsWith('portal:');
}

// Shopify tag filters are case-insensitive
function hasTag(product, tag) {
  const wanted = tag.toLowerCase();
  return product.tags.some((t) => t.toLowerCase() === wanted);
}

/**
 * `fetchProducts` for a collection page: same collection, given filters.
 * @param {any} storefront
 * @param {string} handle
 */
export function collectionProductsFetcher(storefront, handle) {
  return async (filters) => {
    const {collection} = await storefront.query(FACET_COLLECTION_QUERY, {
      variables: {handle, filters},
      cache: storefront.CacheShort(),
    });
    return collection?.products?.nodes ?? [];
  };
}

/**
 * `fetchProducts` for the search page: same term, given filters.
 * @param {any} storefront
 * @param {string} term
 */
export function searchProductsFetcher(storefront, term) {
  return async (filters) => {
    const {search} = await storefront.query(FACET_SEARCH_QUERY, {
      variables: {term, filters},
      cache: storefront.CacheShort(),
    });
    return search?.nodes ?? [];
  };
}

const FACET_COLLECTION_QUERY = `#graphql
  query PortalFacetCollectionProducts(
    $handle: String!
    $filters: [ProductFilter!]
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: 250, filters: $filters) {
        nodes {
          id
          tags
        }
      }
    }
  }
`;

const FACET_SEARCH_QUERY = `#graphql
  query PortalFacetSearchProducts(
    $term: String!
    $filters: [ProductFilter!]
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    search(
      first: 250
      query: $term
      types: [PRODUCT]
      unavailableProducts: HIDE
      productFilters: $filters
    ) {
      nodes {
        ... on Product {
          id
          tags
        }
      }
    }
  }
`;

/** @typedef {{id: string; values: {id: string; label: string; count: number; input: string}[]}} Filter */
