import {Link, useNavigate} from 'react-router';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import {useState} from 'react';

/**
 * @param {{
 *   productOptions: MappedProductOptions[];
 *   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
 * }}
 */
export function ProductForm({productOptions, selectedVariant}) {
  const navigate = useNavigate();
  const {open} = useAside();

  // Filter out "Order Type" from the options
  const filteredOptions = productOptions.filter(
    (option) => option.name !== 'Order Type',
  );

  // Get the minimum order quantity from variant metafield or default to 22
  const minimumQuantity = selectedVariant?.minimumQuantity?.value
    ? parseInt(selectedVariant.minimumQuantity.value)
    : 22;

  // State for quantity selector
  const [quantity, setQuantity] = useState(minimumQuantity);

  // Calculate total price for bulk order
  const bulkPrice = selectedVariant?.price?.amount
    ? (parseFloat(selectedVariant.price.amount) * quantity).toFixed(2)
    : '0.00';

  // Handle quantity decrease
  const decreaseQuantity = () => {
    if (quantity > minimumQuantity) {
      setQuantity(quantity - 1);
    }
  };

  // Handle quantity increase
  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };

  // Handle direct input
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= minimumQuantity) {
      setQuantity(value);
    }
  };

  return (
    <div className="product-form">
      {filteredOptions.map((option, index) => {
        // If there is only a single value in the option values, don't display the option
        if (option.optionValues.length === 1) return null;

        const isColorOption = option.name === 'Color';

        // Get the selected value name
        const selectedValue = option.optionValues.find((v) => v.selected);
        const selectedName = selectedValue?.name || '';

        return (
          <div
            className={`product-options ${isColorOption ? 'product-options-color' : ''}`}
            key={option.name}
          >
            <div className="product-options-header">
              <h5>
                <span className="option-bullet">●</span>
                <span className="option-number">{index + 1}.</span>{' '}
                {option.name.toUpperCase()}: {selectedName.toUpperCase()}
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
                }
              })}
            </div>
          </div>
        );
      })}

      {/* Quantity selector */}
      <div className="quantity-selector">
        <div className="quantity-controls">
          <span>QTY</span>
          <button
            type="button"
            onClick={decreaseQuantity}
            disabled={quantity <= minimumQuantity}
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={handleQuantityChange}
            min={minimumQuantity}
          />
          <button type="button" onClick={increaseQuantity}>
            +
          </button>
        </div>
      </div>

      {/* Quantity display and bulk order info */}
      <div className="product-quantity-info">
        <p>Minimum Order Quantity: {minimumQuantity} units</p>
        <p>Ready to ship. when?</p>
      </div>

      {/* Bulk order button */}
      <AddToCartButton
        className="add-cart"
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => {
          open('cart');
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: quantity,
                  selectedVariant,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale
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
        onClick={() => {
          open('cart');
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                },
              ]
            : []
        }
        className="sample-button"
      >
        PURCHASE SAMPLE
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
