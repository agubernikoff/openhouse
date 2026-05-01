import {CartForm, Image} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * @param {{
 *   layout: CartLayout;
 *   line: CartLine;
 * }}
 */
export function CartLineItem({layout, line}) {
  const {id, merchandise, attributes} = line; // Add attributes here
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();

  return (
    <li key={id} className="cart-line">
      {/* Image div */}
      <div className="cart-line-image">
        {image && (
          <Image
            alt={title}
            // aspectRatio="1/1"
            data={image}
            loading="lazy"
            width={200}
            sizes="200px"
          />
        )}
      </div>

      {/* Details div with title/price at top and options at bottom */}
      <div className="cart-line-details">
        <div className="cart-line-header">
          <Link
            prefetch="intent"
            to={lineItemUrl}
            onClick={() => {
              if (layout === 'aside') {
                close();
              }
            }}
          >
            <p>
              {product.title}
              {attributes?.some(
                (a) => a.key === '_order_type' && a.value === 'sample',
              ) && ' (Sample)'}
            </p>
          </Link>
          <ProductPrice price={line?.cost?.totalAmount} />
        </div>

        <div className="cart-line-options">
          <ul>
            {selectedOptions
              .filter((option) => option.name !== 'Order Type') // Filter out Order Type
              .map((option) => (
                <li key={option.name}>
                  {option.name === 'Embellishment Type'
                    ? 'Embellishment'
                    : option.name}
                  : {option.value}
                </li>
              ))}
            {/* Add attributes display here */}
            {attributes?.map((attribute) => {
              // Only show attributes that don't start with underscore
              if (!attribute.key.startsWith('_')) {
                return (
                  <li key={attribute.key}>
                    {attribute.key}: {attribute.value}
                  </li>
                );
              }
              return null;
            })}
          </ul>
          <CartLineQuantity line={line} />
        </div>
      </div>

      {/* Actions div for delete and edit */}
      <div className="cart-line-actions">
        <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} />
      </div>
    </li>
  );
}

/**
 * A grouped cart entry for wholesale line items sharing a color.
 */
export function CartLineGroup({color, lines, layout}) {
  const {close} = useAside();
  const firstLine = lines[0];
  const {product, image, selectedOptions} = firstLine.merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const groupTotal = lines
    .reduce(
      (sum, line) => sum + parseFloat(line.cost?.totalAmount?.amount ?? 0),
      0,
    )
    .toFixed(2);
  const currencyCode = firstLine.cost?.totalAmount?.currencyCode ?? 'USD';
  const allLineIds = lines.map((l) => l.id);

  return (
    <li className="cart-line">
      <div className="cart-line-image">
        {image && (
          <Image
            alt={product.title}
            data={image}
            loading="lazy"
            width={200}
            sizes="200px"
          />
        )}
      </div>
      <div className="cart-line-details">
        <div className="cart-line-header">
          <Link
            prefetch="intent"
            to={lineItemUrl}
            onClick={() => layout === 'aside' && close()}
          >
            <p>{product.title}</p>
          </Link>
          <ProductPrice price={{amount: groupTotal, currencyCode}} />
        </div>
        <div className="cart-line-options">
          <div style={{display: 'flex', gap: '8px'}}>
            {[...lines]
              .sort((a, b) => {
                const sizeOrder = [
                  'XS',
                  'S',
                  'M',
                  'L',
                  'XL',
                  'XXL',
                  '2XL',
                  'XXXL',
                  '3XL',
                ];
                const sizeA =
                  a.merchandise.selectedOptions
                    .find((o) => o.name === 'Size')
                    ?.value?.toUpperCase() ?? '';
                const sizeB =
                  b.merchandise.selectedOptions
                    .find((o) => o.name === 'Size')
                    ?.value?.toUpperCase() ?? '';
                const iA = sizeOrder.indexOf(sizeA);
                const iB = sizeOrder.indexOf(sizeB);
                return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB);
              })
              .map((line) => {
                const size = line.merchandise.selectedOptions.find(
                  (o) => o.name === 'Size',
                )?.value;
                return (
                  <li key={line.id}>
                    {size}: {line.quantity}
                  </li>
                );
              })}
          </div>
          <ul>
            <li>{`Color: ${color}`}</li>
            <li>{`Quantity: ${lines.reduce((sum, line) => sum + line.quantity, 0)}`}</li>
          </ul>
        </div>
      </div>
      <div className="cart-line-actions">
        <CartLineRemoveButton
          lineIds={allLineIds}
          disabled={lines.some((l) => !!l.isOptimistic)}
        />
      </div>
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 * @param {{line: CartLine}}
 */
function CartLineQuantity({line}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="cart-line-quantity">
      <p>Quantity: {quantity} &nbsp;&nbsp;</p>
      {/* <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
        <button
          aria-label="Decrease quantity"
          disabled={quantity <= 1 || !!isOptimistic}
          name="decrease-quantity"
          value={prevQuantity}
        >
          <span>&#8722; </span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
        >
          <span>&#43;</span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} /> */}
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 * @param {{
 *   lineIds: string[];
 *   disabled: boolean;
 * }}
 */
function CartLineRemoveButton({lineIds, disabled}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button disabled={disabled} type="submit">
        Delete
      </button>
    </CartForm>
  );
}

/**
 * @param {{
 *   children: React.ReactNode;
 *   lines: CartLineUpdateInput[];
 * }}
 */
function CartLineUpdateButton({children, lines}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @returns
 * @param {string[]} lineIds - line ids affected by the update
 */
function getUpdateKey(lineIds) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}

/** @typedef {OptimisticCartLine<CartApiQueryFragment>} CartLine */

/** @typedef {import('@shopify/hydrogen/storefront-api-types').CartLineUpdateInput} CartLineUpdateInput */
/** @typedef {import('~/components/CartMain').CartLayout} CartLayout */
/** @typedef {import('@shopify/hydrogen').OptimisticCartLine} OptimisticCartLine */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
