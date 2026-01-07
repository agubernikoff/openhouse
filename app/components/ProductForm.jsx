import {Link, useNavigate} from 'react-router';
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
export function ProductForm({productOptions, selectedVariant}) {
  const navigate = useNavigate();
  const {open} = useAside();

  // Filter out "Order Type" from the options
  const filteredOptions = productOptions.filter(
    (option) => option.name !== 'Order Type',
  );

  // Get the minimum order quantity from variant metafield (priority) or product metafield
  // If variant has minimumQuantity, use it; otherwise fall back to product level
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

  // State for quantity selector - start with minimum or 1
  const [quantity, setQuantity] = useState(minimumQuantity || 1);

  // State for "added to cart" feedback
  const [bulkAdded, setBulkAdded] = useState(false);
  const [sampleAdded, setSampleAdded] = useState(false);

  // State for file upload
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // State for client-side only preview URL
  const [previewUrl, setPreviewUrl] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Track when component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Create preview URL only on client side
  useEffect(() => {
    if (uploadedFile && isMounted) {
      const url = URL.createObjectURL(uploadedFile);
      setPreviewUrl(url);

      // Cleanup
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [uploadedFile, isMounted]);

  // Calculate total price for bulk order
  const bulkPrice = selectedVariant?.price?.amount
    ? (parseFloat(selectedVariant.price.amount) * quantity).toFixed(2)
    : '0.00';

  // Handle quantity decrease
  const decreaseQuantity = () => {
    const minQty = minimumQuantity || 1;
    if (quantity > minQty) {
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
    const minQty = minimumQuantity || 1;
    if (!isNaN(value) && value >= minQty) {
      setQuantity(value);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError(
        'Please upload an image file (JPG, PNG, GIF, WebP) or PDF',
      );
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      // Upload to your server/S3
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', selectedVariant?.product?.id || '');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadedFile(file);
      setUploadedFileUrl(data.url); // S3 URL returned from server
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedFileUrl('');
    setUploadError('');
    setPreviewUrl('');
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file type
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
      ];
      if (!validTypes.includes(file.type)) {
        setUploadError(
          'Please upload an image file (JPG, PNG, GIF, WebP) or PDF',
        );
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }

      setUploadError('');
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('productId', selectedVariant?.product?.id || '');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        setUploadedFile(file);
        setUploadedFileUrl(data.url);
      } catch (error) {
        console.error('Upload error:', error);
        setUploadError('Failed to upload file. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Handle bulk add to cart
  const handleBulkAddToCart = () => {
    setBulkAdded(true);
    setTimeout(() => {
      setBulkAdded(false);
      open('cart');
    }, 500);
  };

  // Handle sample add to cart
  const handleSampleAddToCart = () => {
    setSampleAdded(true);
    setTimeout(() => {
      setSampleAdded(false);
      open('cart');
    }, 500);
  };

  // Calculate which number this upload option should be
  const uploadOptionNumber =
    filteredOptions.filter((opt) => opt.optionValues.length > 1).length + 1;

  return (
    <div className="product-form">
      {filteredOptions.map((option, index) => {
        // If there is only a single value in the option values, don't display the option
        if (option.optionValues.length === 1) return null;

        const isColorOption = option.name === 'Color';
        const isEmbroideryOption = option.name === 'Embellishment Type';

        // Get the selected value name
        const selectedValue = option.optionValues.find((v) => v.selected);
        const selectedName = selectedValue?.name || '';

        // Calculate the actual display number by counting how many options are actually shown before this one
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

      {/* Upload Artwork Section */}
      <div className="product-options product-options-upload">
        <div className="product-options-header">
          <h5>
            <span className="option-bullet">●</span>
            <span className="option-number">{uploadOptionNumber}.</span> UPLOAD
            ARTWORK:{' '}
            {uploadedFile ? uploadedFile.name.toUpperCase() : 'NO FILE'}
          </h5>
          <span className="option-optional">OPTIONAL</span>
        </div>

        <div className="upload-container">
          <div
            className={`upload-preview ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!uploadedFile ? (
              <>
                <input
                  type="file"
                  id="artwork-upload"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  style={{display: 'none'}}
                />
                <label htmlFor="artwork-upload" className="upload-button">
                  {isUploading ? 'UPLOADING...' : 'CHOOSE FILE'}
                </label>
                <p className="upload-hint">
                  {isDragging
                    ? 'Drop file here...'
                    : 'Or drag and drop a file here'}
                </p>
                <p className="upload-hint">
                  Accepted formats: JPG, PNG, PDF (Max 10MB)
                </p>
              </>
            ) : (
              <>
                {isMounted &&
                uploadedFile.type.startsWith('image/') &&
                previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Uploaded artwork preview"
                    className="upload-preview-image"
                  />
                ) : uploadedFile.type.startsWith('image/') ? (
                  // Placeholder while loading on client
                  <div
                    className="upload-preview-image"
                    style={{
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                ) : (
                  <div
                    className="upload-preview-image"
                    style={{
                      background: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      color: 'white',
                      borderRadius: '4px',
                    }}
                  >
                    📄
                  </div>
                )}
                <div className="upload-info">
                  <p className="upload-filename">{uploadedFile.name}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="upload-remove-button"
                >
                  Remove Artwork
                </button>
              </>
            )}
          </div>

          {uploadError && <p className="upload-error">{uploadError}</p>}
        </div>
      </div>

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
                  attributes: uploadedFileUrl
                    ? [
                        {
                          key: 'Artwork',
                          value:
                            uploadedFile?.name.replace(/\.[^/.]+$/, '') || '',
                        },
                        {
                          key: '_Upload Artwork',
                          value: uploadedFileUrl,
                        },
                      ]
                    : [],
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
                  attributes: uploadedFileUrl
                    ? [
                        {
                          key: 'Artwork',
                          value:
                            uploadedFile?.name.replace(/\.[^/.]+$/, '') || '',
                        },
                        {
                          key: '_Upload Artwork',
                          value: uploadedFileUrl,
                        },
                      ]
                    : [],
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
