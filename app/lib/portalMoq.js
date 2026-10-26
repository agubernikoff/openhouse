/**
 * Minimum order quantities for portal orders (plan §4.5 / §4.6), shared by
 * the product form, the cart UI and the server-side checkout check.
 *
 * Existing wholesale structure: each color of a product must meet its MOQ —
 * the variant's `custom.variant_minimum_quantity_priority`, else the
 * product's `custom.minimum_quantity`. Products without a Color option apply
 * the product MOQ to the product's total.
 */

/**
 * @param {{value?: string | null} | null | undefined} metafield
 * @return {number | null}
 */
export function parseMoq(metafield) {
  const value = parseInt(metafield?.value, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Cart lines are grouped like CartMain displays them: per product and
 * `_color` line attribute.
 * @param {any} line
 */
export function cartMoqGroupKey(line) {
  const color = line.attributes?.find((a) => a.key === '_color')?.value;
  return `${line.merchandise?.product?.id}::${color ?? ''}`;
}

/**
 * Groups below their MOQ, keyed by `cartMoqGroupKey`.
 * @param {any} cart
 * @return {Map<string, {title: string; color: string | null; total: number; moq: number}>}
 */
export function cartMoqViolations(cart) {
  /** @type {Map<string, {lines: any[]; color: string | null}>} */
  const groups = new Map();
  for (const line of cart?.lines?.nodes ?? []) {
    if (!line.merchandise?.product) continue;
    const key = cartMoqGroupKey(line);
    const color =
      line.attributes?.find((a) => a.key === '_color')?.value ?? null;
    if (!groups.has(key)) groups.set(key, {lines: [], color});
    groups.get(key).lines.push(line);
  }

  const violations = new Map();
  for (const [key, {lines, color}] of groups) {
    const {merchandise} = lines[0];
    const productMoq = parseMoq(merchandise.product.minimumQuantity);
    const moq = color
      ? (parseMoq(merchandise.minimumQuantity) ?? productMoq)
      : productMoq;
    const total = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
    if (moq != null && total < moq) {
      violations.set(key, {
        title: merchandise.product.title,
        color,
        total,
        moq,
      });
    }
  }
  return violations;
}
