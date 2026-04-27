import {Link, useNavigate} from 'react-router';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import {useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import mapRichText from '~/helpers/mapRichText';

/**
 * @param {{
 *   productOptions: MappedProductOptions[];
 *   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
 * }}
 */
export function ProductForm({productOptions, selectedVariant}) {
  const navigate = useNavigate();
  const {open} = useAside();

  const filteredOptions = productOptions.filter(
    (option) => option.name !== 'Order Type',
  );

  const variantMinQty = selectedVariant?.minimumQuantity?.value
    ? parseInt(selectedVariant.minimumQuantity.value)
    : null;

  const productMinQty = selectedVariant?.product?.minimumQuantity?.value
    ? parseInt(selectedVariant.product.minimumQuantity.value)
    : null;

  const minimumQuantity = variantMinQty ?? productMinQty ?? null;
  const hasMinimumQuantity = minimumQuantity !== null;

  const variantLeadTime = selectedVariant?.lead_time?.value
    ? mapRichText(JSON.parse(selectedVariant.lead_time.value))
    : null;

  const productLeadTime = selectedVariant?.product?.lead_time?.value
    ? mapRichText(JSON.parse(selectedVariant.product.lead_time.value))
    : null;

  const leadTime = variantLeadTime ?? productLeadTime ?? null;
  const hasLeadTime = leadTime !== null;

  const [quantity, setQuantity] = useState(minimumQuantity || 1);
  const [bulkAdded, setBulkAdded] = useState(false);
  const [sampleAdded, setSampleAdded] = useState(false);
  const [readyToShip, setReadyToShip] = useState(false);

  function toggleReadyToShip() {
    const newValue = !readyToShip;
    setReadyToShip(newValue);

    if (newValue) {
      const colorOption = productOptions.find((opt) => opt.name === 'Color');
      if (colorOption) {
        const selectedColor = colorOption.optionValues.find((v) => v.selected);
        if (selectedColor && !selectedColor.variant?.lead_time) {
          const firstWithLeadTime = colorOption.optionValues.find(
            (v) => v.variant?.lead_time,
          );
          if (firstWithLeadTime) {
            navigate(`?${firstWithLeadTime.variantUriQuery}`, {
              replace: true,
              preventScrollReset: true,
            });
          }
        }
      }
    }
  }

  const bulkPrice = selectedVariant?.price?.amount
    ? (parseFloat(selectedVariant.price.amount) * quantity).toFixed(2)
    : '0.00';

  const decreaseQuantity = () => {
    const minQty = minimumQuantity || 1;
    if (quantity > minQty) setQuantity(quantity - 1);
  };

  const increaseQuantity = () => setQuantity(quantity + 1);

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    const minQty = minimumQuantity || 1;
    if (!isNaN(value) && value >= minQty) setQuantity(value);
  };

  const handleBulkAddToCart = () => {
    setBulkAdded(true);
    setTimeout(() => {
      setBulkAdded(false);
      open('cart');
    }, 500);
  };

  const handleSampleAddToCart = () => {
    setSampleAdded(true);
    setTimeout(() => {
      setSampleAdded(false);
      open('cart');
    }, 500);
  };

  const hasVarLeadTime = productOptions
    .find((opt) => opt.name === 'Color')
    ?.optionValues?.some((opt) => opt.variant.lead_time);

  return (
    <div className="product-form">
      {hasVarLeadTime && (
        <div
          className="product-options product-options-color"
          style={{
            paddingTop: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 17.5,
          }}
        >
          <button
            className="product-options-item"
            style={{
              border: '1px solid black',
              opacity: 1,
              background: 'transparent',
              color: 'var(--color-oh-black)',
            }}
            onClick={toggleReadyToShip}
          >
            <div
              className="product-option-label-swatch"
              style={{
                background: 'var(--color-oh-red)',
                opacity: readyToShip ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
              }}
            />
          </button>{' '}
          <h5>READY TO SHIP</h5>
        </div>
      )}
      {filteredOptions.map((option, index) => {
        if (option.optionValues.length === 1) return null;

        const isColorOption = option.name === 'Color';
        const isEmbroideryOption = option.name === 'Embellishment Type';

        const selectedValue = option.optionValues.find((v) => v.selected);
        const selectedName = selectedValue?.name || '';

        const displayNumber =
          filteredOptions
            .slice(0, index)
            .filter((opt) => opt.optionValues.length > 1).length + 1;

        return (
          <div
            className={`product-options ${isColorOption ? 'product-options-color' : ''} ${isEmbroideryOption ? 'product-options-embroidery' : ''}`}
            key={option.name}
          >
            <div className="product-options-header">
              <h5>
                <span className="option-bullet">●</span>
                <span className="option-number">{displayNumber}.</span>{' '}
                {(option.name === 'Embellishment Type'
                  ? 'Embellishment'
                  : option.name
                ).toUpperCase()}
                :{' '}
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
            <div className="product-options-grid">
              {option.optionValues.map((value) => {
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
                } else {
                  return (
                    <button
                      type="button"
                      className={`product-options-item${
                        exists && !selected ? ' link' : ''
                      }`}
                      key={option.name + name}
                      style={{
                        border: selected
                          ? '1px solid black'
                          : '1px solid transparent',
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
                      disabled={
                        !exists ||
                        (readyToShip &&
                          !value.variant?.lead_time &&
                          option.name === 'Color')
                      }
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
                }
              })}
            </div>
          </div>
        );
      })}

      {/* <ArtworkUpload selectedVariant={selectedVariant} optionNumber={...} /> */}

      {/* Quantity selector */}
      <div className="quantity-selector">
        <div className="quantity-controls">
          <span>QTY</span>
          <button
            type="button"
            onClick={decreaseQuantity}
            disabled={quantity <= (minimumQuantity || 1)}
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={handleQuantityChange}
            min={minimumQuantity || 1}
          />
          <button type="button" onClick={increaseQuantity}>
            +
          </button>
        </div>
      </div>

      {/* Quantity display and bulk order info */}
      <div className="product-quantity-info">
        {hasMinimumQuantity && (
          <p>Minimum Order Quantity: {minimumQuantity} units</p>
        )}
        {hasLeadTime && (
          <div style={{display: 'flex', alignItems: 'center', gap: '3px'}}>
            Estimated lead time: {leadTime}
          </div>
        )}
      </div>

      {/* Bulk order button */}
      <AddToCartButton
        className="add-cart"
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={handleBulkAddToCart}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: quantity,
                  selectedVariant,
                  attributes: [],
                },
              ]
            : []
        }
      >
        {bulkAdded
          ? 'ADDED TO CART'
          : selectedVariant?.availableForSale
            ? `ADD TO CART - $${bulkPrice}`
            : 'Sold out'}
      </AddToCartButton>

      {/* Divider */}
      <div className="button-divider">
        <span>OR</span>
      </div>

      {/* Sample order button */}
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={handleSampleAddToCart}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                  attributes: [],
                },
              ]
            : []
        }
        className="sample-button"
      >
        {sampleAdded ? 'ADDED TO CART' : 'PURCHASE BLANK SAMPLE'}
      </AddToCartButton>
    </div>
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
