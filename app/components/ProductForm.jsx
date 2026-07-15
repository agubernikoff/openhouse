import {Link, NavLink, useNavigate} from 'react-router';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import {useState, useEffect} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import mapRichText from '~/helpers/mapRichText';

/**
 * @param {{
 *   productOptions: MappedProductOptions[];
 *   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
 * }}
 */
export function ProductForm({
  productOptions,
  selectedVariant,
  variants = [],
  madeToOrderLeadTime,
}) {
  const navigate = useNavigate();
  const {open} = useAside();

  const filteredOptions = productOptions.filter(
    (option) => option.name !== 'Order Type',
  );

  // A color is in stock if at least one of its size variants is not currentlyNotInStock.
  const colorInStockMap = variants.reduce((acc, variant) => {
    const color = variant.selectedOptions?.find(
      (o) => o.name === 'Color',
    )?.value;
    if (color && !variant.currentlyNotInStock) {
      acc[color] = true;
    }
    return acc;
  }, {});

  const variantLeadTime = selectedVariant?.lead_time?.value
    ? mapRichText(JSON.parse(selectedVariant.lead_time.value))
    : null;

  const productLeadTime = selectedVariant?.product?.lead_time?.value
    ? mapRichText(JSON.parse(selectedVariant.product.lead_time.value))
    : null;

  const inStockLeadTime = variantLeadTime ?? productLeadTime ?? null;
  const hasInStockLeadTime = inStockLeadTime !== null;

  const parsedMadeToOrderLeadTime = madeToOrderLeadTime
    ? mapRichText(JSON.parse(madeToOrderLeadTime))
    : null;

  // A variant that's sellable but out of physical stock (backorder) is made-to-order.
  const isMadeToOrder = !!selectedVariant?.currentlyNotInStock;
  const displayLeadTime =
    isMadeToOrder && parsedMadeToOrderLeadTime
      ? parsedMadeToOrderLeadTime
      : hasInStockLeadTime
        ? inStockLeadTime
        : null;

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // null means untracked or made-to-order — no cap; 0 means truly out of stock
  const selectedVariantQty = isMadeToOrder
    ? null
    : (selectedVariant?.quantityAvailable ?? null);

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const increaseQuantity = () => setQuantity(quantity + 1);

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) {
      setQuantity(
        selectedVariantQty !== null
          ? Math.min(value, selectedVariantQty)
          : value,
      );
    }
  };

  const handleAddToCart = () => {
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      open('cart');
    }, 500);
  };

  useEffect(() => {
    if (selectedVariantQty !== null) {
      setQuantity((prev) => Math.min(prev, Math.max(1, selectedVariantQty)));
    }
  }, [selectedVariantQty]);

  const available =
    !!selectedVariant?.availableForSale &&
    (selectedVariantQty === null ||
      (selectedVariantQty > 0 && quantity <= selectedVariantQty));

  const lines = selectedVariant
    ? [
        {
          merchandiseId: selectedVariant.id,
          quantity,
          selectedVariant,
          attributes: [{key: 'Order Type', value: 'Sample'}],
        },
      ]
    : [];

  const total = selectedVariant?.price?.amount
    ? (parseFloat(selectedVariant.price.amount) * quantity).toFixed(2)
    : '0.00';

  const isDisabled = !selectedVariant || !available;

  return (
    <div className="product-form">
      {filteredOptions.map((option, index) => {
        const isColorOption = option.name.toLowerCase() === 'color';
        const isSizeOption = option.name.toLowerCase() === 'size';

        if (option.optionValues.length === 1 && !isColorOption && !isSizeOption)
          return null;

        const selectedValue = option.optionValues.find((v) => v.selected);
        const selectedName = selectedValue?.name || '';

        const displayNumber =
          filteredOptions
            .slice(0, index)
            .filter((opt) => opt.optionValues.length > 1).length + 1;

        const inStock = isColorOption
          ? option.optionValues.filter((v) => colorInStockMap[v.name])
          : [];
        const madeToOrder = isColorOption
          ? option.optionValues.filter((v) => !colorInStockMap[v.name])
          : [];

        const renderValue = (value) => {
          const {
            name,
            handle,
            variantUriQuery,
            selected,
            available,
            exists,
            isDifferentProduct,
            swatch,
          } = value;

          if (isDifferentProduct) {
            return (
              <Link
                className="product-options-item"
                key={option.name + name}
                prefetch="intent"
                preventScrollReset
                replace
                to={`/products/${handle}?${variantUriQuery}`}
                style={{
                  border: selected
                    ? '1px solid black'
                    : '1px solid transparent',
                  opacity: available ? 1 : 0.3,
                }}
              >
                <ProductOptionSwatch swatch={swatch} name={name} />
              </Link>
            );
          }
          return (
            <button
              type="button"
              className={`product-options-item${exists && !selected ? ' link' : ''}`}
              key={option.name + name}
              style={{
                border: selected ? '1px solid black' : '1px solid transparent',
                opacity: available ? 1 : 0.3,
                background:
                  selected && !isColorOption
                    ? 'var(--color-oh-black)'
                    : 'transparent',
                color:
                  selected && !isColorOption
                    ? 'var(--color-oh-white)'
                    : 'var(--color-oh-black)',
              }}
              disabled={!exists}
              onClick={() => {
                if (!selected) {
                  void navigate(`?${variantUriQuery}`, {
                    replace: true,
                    preventScrollReset: true,
                  });
                }
              }}
            >
              <ProductOptionSwatch swatch={swatch} name={name} />
            </button>
          );
        };

        return (
          <motion.div
            layout="position"
            className={`product-options ${isColorOption ? 'product-options-color' : ''}`}
            key={option.name}
          >
            <div className="product-options-header">
              <h5>
                <span className="option-bullet">●</span>
                <span className="option-number">{displayNumber}.</span>{' '}
                {option.name.toUpperCase()}:{' '}
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={selectedName}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                  >
                    {selectedName.toUpperCase()}
                  </motion.span>
                </AnimatePresence>
              </h5>
              <span className="option-required">REQUIRED</span>
            </div>

            {isColorOption ? (
              <motion.div layout="position">
                <ColorOptionGrid
                  inStock={inStock}
                  madeToOrder={madeToOrder}
                  renderValue={renderValue}
                />
              </motion.div>
            ) : (
              <div className="product-options-grid">
                {option.optionValues.map(renderValue)}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* <ArtworkUpload selectedVariant={selectedVariant} optionNumber={...} /> */}

      <motion.div layout="position">
        <div className="product-quantity-info">
          <div className="quantity-selector">
            <div className="quantity-controls">
              <span>QTY</span>
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                min={1}
              />
              <button
                type="button"
                onClick={increaseQuantity}
                disabled={
                  selectedVariantQty !== null && quantity >= selectedVariantQty
                }
              >
                +
              </button>
            </div>
          </div>
          {displayLeadTime ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                color: isMadeToOrder ? 'var(--color-oh-yellow)' : undefined,
              }}
            >
              Estimated lead time: {displayLeadTime}
            </div>
          ) : null}
        </div>

        <AddToCartButton
          className="add-cart"
          disabled={isDisabled}
          onClick={handleAddToCart}
          lines={lines}
        >
          {added
            ? 'ADDED TO CART'
            : available
              ? `ADD TO CART - $${total}`
              : 'SOLD OUT'}
        </AddToCartButton>

        <div className="button-divider">
          <span>OR</span>
        </div>

        <div className="custom-cta">
          <h5>CUSTOM</h5>
          <p>
            Want to change body shape, use a Pantone color, or modify weight or
            material?
          </p>
          <NavLink to="/contact" className="sample-button">
            GET IN TOUCH
          </NavLink>
        </div>
      </motion.div>
    </div>
  );
}

function ColorOptionGrid({inStock, madeToOrder, renderValue}) {
  return (
    <AnimatePresence mode="sync">
      {inStock.length > 0 && (
        <motion.h5
          key="in-stock-label"
          className="color-group-label"
          initial={{height: 0, marginBottom: 0}}
          animate={{height: 'auto', marginBottom: '0.5rem'}}
          exit={{height: 0, marginBottom: 0}}
          style={{overflow: 'hidden'}}
        >
          IN STOCK
        </motion.h5>
      )}
      <div className="product-options-grid">{inStock.map(renderValue)}</div>
      {madeToOrder.length > 0 && (
        <motion.h5
          key="made-to-order-label"
          className="color-group-label"
          initial={{height: 0, marginTop: 0, marginBottom: 0}}
          animate={{height: 'auto', marginTop: '1rem', marginBottom: '0.5rem'}}
          exit={{height: 0, marginTop: 0, marginBottom: 0}}
          style={{overflow: 'hidden'}}
        >
          MADE TO ORDER
        </motion.h5>
      )}
      {madeToOrder.length > 0 && (
        <motion.div
          key="made-to-order-grid"
          className="product-options-grid"
          initial={{height: 0}}
          animate={{height: 'auto'}}
          exit={{height: 0}}
          style={{overflow: 'hidden'}}
        >
          {madeToOrder.map(renderValue)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * @param {{
 *   swatch?: Maybe<ProductOptionValueSwatch> | undefined;
 *   name: string;
 * }}
 */
function ProductOptionSwatch({swatch, name}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}

/** @typedef {import('@shopify/hydrogen').MappedProductOptions} MappedProductOptions */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Maybe} Maybe */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductOptionValueSwatch} ProductOptionValueSwatch */
/** @typedef {import('storefrontapi.generated').ProductFragment} ProductFragment */
