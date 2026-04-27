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
  const [orderType, setOrderType] = useState('wholesale');
  const [selectedColors, setSelectedColors] = useState(() => {
    const colorOption = productOptions.find((opt) => opt.name === 'Color');
    const current = colorOption?.optionValues?.find((v) => v.selected);
    return current ? [current.name] : [];
  });

  const bulkPrice = selectedVariant?.price?.amount
    ? (parseFloat(selectedVariant.price.amount) * quantity).toFixed(2)
    : '0.00';

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const increaseQuantity = () => setQuantity(quantity + 1);

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) setQuantity(value);
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

  const sampleDisabled = !productOptions
    .find((opt) => opt.name === 'Color')
    ?.optionValues?.some((opt) => !opt.variant?.currentlyNotInStock);

  const handleOrderTypeChange = (type) => {
    setOrderType(type);
    if (type === 'sample') {
      if (selectedVariant?.currentlyNotInStock) {
        const colorOption = productOptions.find((opt) => opt.name === 'Color');
        const firstInStock = colorOption?.optionValues?.find(
          (v) => !v.variant?.currentlyNotInStock,
        );
        if (firstInStock) {
          navigate(`?${firstInStock.variantUriQuery}`, {
            replace: true,
            preventScrollReset: true,
          });
        }
      }
    }
  };

  return (
    <div className="product-form">
      <div className="product-options" key="order-type">
        <div className="product-options-header">
          <h5>
            <span className="option-bullet">●</span>
            <span className="option-number">1.</span> ORDER TYPE:{' '}
            <AnimatePresence mode="popLayout">
              <motion.span
                key={orderType}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
              >
                {orderType.toUpperCase()}
              </motion.span>
            </AnimatePresence>
          </h5>
          <span className="option-required">REQUIRED</span>
        </div>
        <div className="product-options-grid">
          {['wholesale', 'sample'].map((type) => {
            const isSelected = orderType === type;
            const isDisabled = type === 'sample' && sampleDisabled;
            return (
              <button
                type="button"
                className={`product-options-item${!isSelected && !isDisabled ? ' link' : ''}`}
                key={type}
                style={{
                  border: isSelected
                    ? '1px solid black'
                    : '1px solid transparent',
                  opacity: isDisabled ? 0.3 : 1,
                  background: isSelected
                    ? 'var(--color-oh-black)'
                    : 'transparent',
                  color: isSelected
                    ? 'var(--color-oh-white)'
                    : 'var(--color-oh-black)',
                }}
                disabled={isDisabled}
                onClick={() => handleOrderTypeChange(type)}
              >
                {type.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
      {filteredOptions.map((option, index) => {
        if (option.optionValues.length === 1) return null;

        const isColorOption = option.name === 'Color';
        const isSizeOption = option.name === 'Size';

        const selectedValue = option.optionValues.find((v) => v.selected);
        const selectedName = selectedValue?.name || '';

        const displayNumber =
          filteredOptions
            .slice(0, index)
            .filter((opt) => opt.optionValues.length > 1).length + 2;

        const inStock = isColorOption
          ? option.optionValues.filter((v) => !v.variant?.currentlyNotInStock)
          : [];
        const madeToOrder = isColorOption
          ? option.optionValues.filter((v) => v.variant?.currentlyNotInStock)
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

          const isWholesaleColor = isColorOption && orderType === 'wholesale';
          const isSelected = isWholesaleColor
            ? selectedColors.includes(name)
            : selected;

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
                  border: isSelected
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
              className={`product-options-item${exists && !isSelected ? ' link' : ''}`}
              key={option.name + name}
              style={{
                border: isSelected
                  ? '1px solid black'
                  : '1px solid transparent',
                opacity: available ? 1 : 0.3,
                background:
                  isSelected && !isColorOption
                    ? 'var(--color-oh-black)'
                    : 'transparent',
                color:
                  isSelected && !isColorOption
                    ? 'var(--color-oh-white)'
                    : 'var(--color-oh-black)',
              }}
              disabled={!exists}
              onClick={() => {
                if (isWholesaleColor) {
                  setSelectedColors((prev) =>
                    prev.includes(name)
                      ? prev.filter((c) => c !== name)
                      : [...prev, name],
                  );
                } else if (!isSelected) {
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
                <span style={{display: 'flex'}}>
                  {option.name.toUpperCase()}
                  <AnimatePresence>
                    {isColorOption && orderType === 'wholesale' && (
                      <motion.span
                        key="color-s"
                        initial={{width: 0}}
                        animate={{width: 'auto'}}
                        exit={{width: 0}}
                        style={{overflow: 'hidden', display: 'inline-block'}}
                      >
                        S
                      </motion.span>
                    )}
                  </AnimatePresence>
                  :
                </span>{' '}
                <AnimatePresence mode="popLayout">
                  {isColorOption && orderType === 'wholesale' ? (
                    selectedColors.flatMap((color, i) =>
                      color.split(' ').map((word, j, words) => {
                        const isLastWord = j === words.length - 1;
                        const isLastColor = i === selectedColors.length - 1;
                        const suffix = isLastWord
                          ? isLastColor
                            ? ''
                            : ', '
                          : ' ';
                        return (
                          <motion.span
                            key={`${color}-${word}`}
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            style={{lineHeight: '24px'}}
                          >
                            {word.toUpperCase()}
                            {suffix}
                          </motion.span>
                        );
                      }),
                    )
                  ) : (
                    <motion.span
                      key={selectedName}
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                    >
                      {selectedName.toUpperCase()}
                    </motion.span>
                  )}
                </AnimatePresence>
              </h5>
              <span className="option-required">REQUIRED</span>
            </div>

            {isColorOption ? (
              <motion.div layout="position">
                <ColorOptionGrid
                  orderType={orderType}
                  inStock={inStock}
                  madeToOrder={madeToOrder}
                  renderValue={renderValue}
                />
              </motion.div>
            ) : isSizeOption ? (
              <SizeOptionGrid
                optionValues={option.optionValues}
                renderValue={renderValue}
              />
            ) : (
              <div className="product-options-grid">
                {option.optionValues.map(renderValue)}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* <ArtworkUpload selectedVariant={selectedVariant} optionNumber={...} /> */}

      <AnimatePresence>
        {orderType === 'sample' && (
          <motion.div
            className="quantity-selector"
            initial={{height: 0}}
            animate={{height: 'auto'}}
            exit={{height: 0}}
            style={{overflow: 'hidden'}}
          >
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
                disabled={quantity === selectedVariant?.quantityAvailable}
              >
                +
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div layout="position">
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
                    quantity,
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
      </motion.div>
    </div>
  );
}

function ColorOptionGrid({orderType, inStock, madeToOrder, renderValue}) {
  return (
    <AnimatePresence mode="sync">
      {orderType === 'wholesale' && inStock.length > 0 && (
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
      {orderType === 'wholesale' && madeToOrder.length > 0 && (
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
      {orderType === 'wholesale' && madeToOrder.length > 0 && (
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

function SizeOptionGrid({optionValues, renderValue}) {
  return (
    <div className="product-options-grid">{optionValues.map(renderValue)}</div>
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
