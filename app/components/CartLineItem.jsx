import {CartForm, Image} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import {useState} from 'react';
import {motion} from 'motion/react';

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * @param {{
 *   layout: CartLayout;
 *   line: CartLine;
 * }}
 */
export function CartLineItem({layout, line}) {
  const {id, merchandise, attributes} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const [isEditing, setIsEditing] = useState(false);

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
                (a) => a.key === 'Order Type' && a.value === 'Sample',
              ) && ' (Sample)'}
            </p>
          </Link>
          <ProductPrice price={line?.cost?.totalAmount} />
        </div>

        <div className="cart-line-options">
          <CartLineQuantity line={line} isEditing={isEditing} />
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
            {attributes?.map((attribute) => {
              if (
                !attribute.key.startsWith('_') &&
                attribute.key !== 'Order Type'
              ) {
                return (
                  <li key={attribute.key}>
                    {attribute.key}: {attribute.value}
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </div>
      </div>

      <div className="cart-line-actions">
        <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} />
        {layout === 'page' && (
          <button type="button" onClick={() => setIsEditing((e) => !e)}>
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * A grouped cart entry for wholesale line items sharing a color.
 */
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL'];

function sortBySize(lines) {
  return [...lines].sort((a, b) => {
    const sizeA =
      a.merchandise.selectedOptions
        .find((o) => o.name === 'Size')
        ?.value?.toUpperCase() ?? '';
    const sizeB =
      b.merchandise.selectedOptions
        .find((o) => o.name === 'Size')
        ?.value?.toUpperCase() ?? '';
    const iA = SIZE_ORDER.indexOf(sizeA);
    const iB = SIZE_ORDER.indexOf(sizeB);
    return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB);
  });
}

export function CartLineGroup({color, lines, layout}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLayout, setEditLayout] = useState(false);
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
  const sorted = sortBySize(lines);
  const exitDuration = sorted.length * 100 + 150;

  const handleToggle = () => {
    if (isEditing) {
      setIsEditing(false);
      setTimeout(() => setEditLayout(false), exitDuration);
    } else {
      setEditLayout(true);
      setIsEditing(true);
    }
  };

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
          <div
            className="cart-line-quantity"
            style={{
              flexDirection: editLayout ? 'column' : 'row ',
              alignItems: editLayout ? 'flex-start' : 'center',
              gap: editLayout ? '.125rem' : '.5rem',
            }}
          >
            {sorted.map((line, i) => {
              const size = line.merchandise.selectedOptions.find(
                (o) => o.name === 'Size',
              )?.value;
              return (
                <div
                  key={line.id}
                  style={{display: 'flex', alignItems: 'center', gap: '4px'}}
                >
                  <motion.span
                    layout="position"
                    transition={{
                      delay: isEditing
                        ? i * 0.1
                        : (sorted.length - 1 - i) * 0.1,
                    }}
                  >
                    {size}:{' '}
                  </motion.span>
                  <motion.span
                    key={`decrease-${line.id}`}
                    animate={{width: isEditing ? 'auto' : 0}}
                    style={{overflow: 'hidden', width: 0}}
                    transition={{
                      delay: isEditing
                        ? 0.3 + i * 0.1
                        : (sorted.length - 1 - i) * 0.1,
                    }}
                  >
                    <CartLineUpdateButton
                      lines={[
                        {id: line.id, quantity: Math.max(1, line.quantity - 1)},
                      ]}
                    >
                      <button
                        type="submit"
                        disabled={line.quantity <= 1 || !!line.isOptimistic}
                      >
                        -
                      </button>
                    </CartLineUpdateButton>
                  </motion.span>
                  <motion.span
                    key={`qty-${line.id}`}
                    layout="position"
                    transition={{
                      delay: isEditing
                        ? i * 0.1
                        : (sorted.length - 1 - i) * 0.1,
                    }}
                  >
                    {line.quantity}
                  </motion.span>
                  <motion.span
                    key={`increase-${line.id}`}
                    animate={{width: isEditing ? 'auto' : 0}}
                    style={{overflow: 'hidden', width: 0}}
                    transition={{
                      delay: isEditing
                        ? 0.3 + i * 0.1
                        : (sorted.length - 1 - i) * 0.1,
                    }}
                  >
                    <CartLineUpdateButton
                      lines={[{id: line.id, quantity: line.quantity + 1}]}
                    >
                      <button type="submit" disabled={!!line.isOptimistic}>
                        +
                      </button>
                    </CartLineUpdateButton>
                  </motion.span>
                </div>
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
        {layout === 'page' && (
          <button type="button" onClick={handleToggle}>
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
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
function CartLineQuantity({line, isEditing}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Math.max(1, quantity - 1);
  const nextQuantity = quantity + 1;

  return (
    <div className="cart-line-quantity">
      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
        Quantity:{' '}
        <motion.span
          key={`decrease-${lineId}`}
          animate={{width: isEditing ? 'auto' : 0}}
          style={{overflow: 'hidden', width: 0}}
        >
          <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
            <button
              type="submit"
              disabled={quantity <= 1 || !!isOptimistic || !isEditing}
            >
              -
            </button>
          </CartLineUpdateButton>
        </motion.span>
        <motion.span layout="position">{quantity}</motion.span>
        <motion.span
          key={`increase-${lineId}`}
          animate={{width: isEditing ? 'auto' : 0}}
          style={{overflow: 'hidden', width: 0}}
        >
          <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
            <button type="submit" disabled={!!isOptimistic || !isEditing}>
              +
            </button>
          </CartLineUpdateButton>
        </motion.span>
      </div>
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
