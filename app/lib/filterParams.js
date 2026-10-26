/**
 * `?filter=` params (set by the Filter component) hold ProductFilter inputs
 * as JSON. Malformed ones are skipped rather than failing the request.
 * @param {URLSearchParams} searchParams
 */
export function parseFilterParams(searchParams) {
  return searchParams.getAll('filter').flatMap((value) => {
    try {
      return [JSON.parse(value)];
    } catch {
      return [];
    }
  });
}
