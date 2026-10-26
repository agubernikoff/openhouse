import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {CartForm, Money} from '@shopify/hydrogen';
import {AnimatePresence, motion} from 'motion/react';
import {ProductOptionSwatch} from '~/components/ProductForm';
import {parseMoq} from '~/lib/portalMoq';

/**
 * Portal product form (plan §4.5): the wholesale mode of the pre-7b1371d
 * ProductForm (guides/productForm/productForm.md) without the sample mode.
 * Franchisees pick one or more colors and enter quantities per size (or per
 * remaining option), then add the whole mix to the cart at once.
 *
 * MOQ keeps the existing wholesale structure: each selected color must meet
 * its MOQ (the color's `variant_minimum_quantity_priority`, else the
 * product's `minimum_quantity`); products without a Color option apply the
 * product MOQ to the total. No stock caps: portal products keep selling
 * when out of stock.
 *
 * @param {{
 *   productOptions: import('@shopify/hydrogen').MappedProductOptions[];
 *   variants: any[];
 *   productMoq: number | null;
 *   leadTime?: string;
 *   catalogPath: string;
 * }}
 */
export function PortalProductForm({
  productOptions,
  variants,
  productMoq,
  leadTime,
  catalogPath,
}) {
  const colorOption = productOptions.find((o) => o.name === 'Color');
  // Options that vary within a color, e.g. Size. Single-value options
  // (including Shopify's implicit "Title: Default Title") don't label inputs.
  const otherOptions = productOptions.filter(
    (o) =>
      o.name !== 'Color' &&
      o.name !== 'Order Type' &&
      o.optionValues.length > 1,
  );
  // Per-color MOQ, same source as the old wholesale form's colorMOQMap
  const colorMoq = Object.fromEntries(
    (colorOption?.optionValues ?? []).map((v) => [
      v.name,
      parseMoq(v.variant?.minimumQuantity) ?? productMoq,
    ]),
  );

  // Colors chosen so far; products without Color have one unnamed group
  const [selectedColors, setSelectedColors] = useState([]);
  // variant id → quantity
  const [quantities, setQuantities] = useState({});

  const groupColors = colorOption ? selectedColors : [null];
  const groups = groupColors.map((color) => {
    const groupVariants = sortVariants(
      variants.filter(
        (v) => color === null || optionValue(v, 'Color') === color,
      ),
      otherOptions,
    );
    const moq = color ? colorMoq[color] : productMoq;
    const total = groupVariants.reduce(
      (sum, v) => sum + (quantities[v.id] ?? 0),
      0,
    );
    return {color, variants: groupVariants, moq, total};
  });

  const lines = groups.flatMap((g) =>
    g.variants
      .filter((v) => (quantities[v.id] ?? 0) > 0)
      .map((v) => ({
        merchandiseId: v.id,
        quantity: quantities[v.id],
        selectedVariant: v,
        // CartMain groups `_color` lines into one CartLineGroup per product
        // and color, the same cart display the old wholesale form used
        ...(g.color && {attributes: [{key: '_color', value: g.color}]}),
      })),
  );
  const belowMoq = groups.some((g) => g.moq != null && g.total < g.moq);
  const orderTotal = lines.reduce(
    (sum, l) => sum + parseFloat(l.selectedVariant.price.amount) * l.quantity,
    0,
  );
  const currencyCode = variants[0]?.price?.currencyCode ?? 'USD';

  const toggleColor = (name) => {
    setSelectedColors((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  };

  const setQuantity = (variantId, value) => {
    const qty = Math.max(0, Math.min(99999, parseInt(value, 10) || 0));
    setQuantities((prev) => ({...prev, [variantId]: qty}));
  };

  const removeColor = (color) => {
    setSelectedColors((prev) => prev.filter((c) => c !== color));
    setQuantities((prev) => {
      const next = {...prev};
      for (const v of variants) {
        if (optionValue(v, 'Color') === color) delete next[v.id];
      }
      return next;
    });
  };

  return (
    <div className="product-form portal-product-form">
      {colorOption && (
        <div className="product-options product-options-color">
          <div className="product-options-header">
            <p className="option-caption" id="portal-colors-label">
              <span className="option-bullet">●</span>
              <span className="option-number">1.</span> COLORS:{' '}
              <span>
                {selectedColors.length
                  ? selectedColors.join(', ').toUpperCase()
                  : 'SELECT ONE OR MORE'}
              </span>
            </p>
            <span className="option-required">REQUIRED</span>
          </div>
          <div
            className="product-options-grid"
            role="group"
            aria-labelledby="portal-colors-label"
          >
            {colorOption.optionValues.map(({name, swatch, exists}) => {
              const selected = selectedColors.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  className={`product-options-item${exists && !selected ? ' link' : ''}`}
                  aria-pressed={selected}
                  aria-label={name}
                  disabled={!exists}
                  onClick={() => toggleColor(name)}
                  style={{
                    border: selected
                      ? '1px solid black'
                      : '1px solid transparent',
                    opacity: exists ? 1 : 0.3,
                  }}
                >
                  <ProductOptionSwatch swatch={swatch} name={name} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {groups.map((group) => (
          <motion.div
            key={group.color ?? 'all'}
            className="product-options"
            initial={{height: 0, opacity: 0}}
            animate={{height: 'auto', opacity: 1}}
            exit={{height: 0, opacity: 0}}
            style={{overflow: 'hidden'}}
          >
            <QuantityGroup
              group={group}
              otherOptions={otherOptions}
              quantities={quantities}
              onQuantityChange={setQuantity}
              onRemove={group.color ? () => removeColor(group.color) : null}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {leadTime && <p className="portal-lead-time">{leadTime}</p>}

      <PortalAddToCart
        lines={lines}
        disabled={lines.length === 0 || belowMoq}
        catalogPath={catalogPath}
        onAdded={() => {
          setQuantities({});
          setSelectedColors([]);
        }}
      >
        ADD TO CART -{' '}
        <Money data={{amount: orderTotal.toFixed(2), currencyCode}} as="span" />
      </PortalAddToCart>
    </div>
  );
}

/**
 * Quantity inputs for one color (or for the whole product without Color),
 * with the running total against the MOQ.
 */
function QuantityGroup({
  group,
  otherOptions,
  quantities,
  onQuantityChange,
  onRemove,
}) {
  const {color, variants, moq, total} = group;
  const groupId = (color ?? 'all').replace(/\W+/g, '-').toLowerCase();

  return (
    <>
      {color && (
        <div className="product-options-header">
          <p className="option-caption">
            <span className="option-bullet">●</span>
            {color.toUpperCase()}
          </p>
          <button
            type="button"
            className="portal-link-button"
            onClick={onRemove}
            aria-label={`Remove ${color}`}
          >
            Delete
          </button>
        </div>
      )}
      <div className="product-options-grid">
        {variants.map((variant) => {
          const label =
            otherOptions
              .map((o) => optionValue(variant, o.name))
              .filter(Boolean)
              .join(' / ') || 'QTY';
          const inputId = `qty-${groupId}-${variant.id.split('/').pop()}`;
          return (
            <div key={variant.id} className="product-options-item">
              <label htmlFor={inputId}>{label.toUpperCase()}</label>
              <input
                id={inputId}
                type="number"
                inputMode="numeric"
                min={0}
                max={99999}
                value={quantities[variant.id] ?? 0}
                onChange={(e) => onQuantityChange(variant.id, e.target.value)}
                disabled={!variant.availableForSale}
              />
            </div>
          );
        })}
      </div>
      {moq != null && (
        <p
          className="moq-label"
          aria-live="polite"
          style={{
            textAlign: 'right',
            color:
              total >= moq ? 'var(--color-oh-black)' : 'var(--color-oh-red)',
          }}
        >
          {`TOTAL(${total})`}
          {total < moq && ` IS BELOW MOQ(${moq})`}
        </p>
      )}
    </>
  );
}

/**
 * Add-to-cart for the portal: same CartForm action as the main site, but
 * reports the server's response (e.g. not verified) and links to the cart
 * page, since portals use the cart page instead of the header drawer.
 */
function PortalAddToCart({lines, disabled, catalogPath, onAdded, children}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher) => (
        <AddToCartState
          fetcher={fetcher}
          disabled={disabled}
          catalogPath={catalogPath}
          onAdded={onAdded}
        >
          {children}
        </AddToCartState>
      )}
    </CartForm>
  );
}

function AddToCartState({fetcher, disabled, catalogPath, onAdded, children}) {
  const busy = fetcher.state !== 'idle';
  const error = fetcher.data?.errors?.[0]?.message;
  const added = fetcher.state === 'idle' && fetcher.data && !error;

  useEffect(() => {
    if (added) onAdded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data]);

  return (
    <>
      <button type="submit" className="add-cart" disabled={disabled || busy}>
        {busy ? 'ADDING…' : children}
      </button>
      <div aria-live="polite" className="portal-cart-status">
        {error && <p className="portal-form-error">{error}</p>}
        {added && (
          <p>
            Added to cart. <Link to="/cart">View cart</Link> or{' '}
            <Link to={catalogPath}>keep shopping</Link>.
          </p>
        )}
      </div>
    </>
  );
}

function optionValue(variant, name) {
  return variant.selectedOptions?.find((o) => o.name === name)?.value;
}

/** Variants in the order their option values appear on the product. */
function sortVariants(variants, options) {
  const rank = (variant) =>
    options.map((o) =>
      o.optionValues.findIndex((v) => v.name === optionValue(variant, o.name)),
    );
  return [...variants].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] !== rb[i]) return ra[i] - rb[i];
    }
    return 0;
  });
}
