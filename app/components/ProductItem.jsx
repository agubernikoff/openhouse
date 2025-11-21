import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {useState} from 'react';

/**
 * @param {{
 *   product:
 *     | CollectionItemFragment
 *     | ProductItemFragment
 *     | RecommendedProductFragment;
 *   loading?: 'eager' | 'lazy';
 * }}
 */
export function ProductItem({product, loading}) {
  const variantUrl = useVariantUrl(product.handle);
  const [hoveredImage, setHoveredImage] = useState(null);

  // Find the color option
  const colorOption = product.options?.find(
    (opt) => opt.name.toLowerCase() === 'color',
  );

  const displayImage = hoveredImage || product.featuredImage;

  const maxSwatches = 7;
  const colorValues = colorOption?.optionValues || [];
  const visibleSwatches = colorValues.slice(0, maxSwatches);
  const remainingCount = colorValues.length - maxSwatches;

  // Check if low stock is true
  const isLowStock = product.lowStock?.value === 'true';

  return (
    <Link
      className="product-item"
      key={product.id}
      prefetch="intent"
      to={variantUrl}
    >
      <div className="product-image-container">
        {displayImage && (
          <Image
            alt={displayImage.altText || product.title}
            aspectRatio="1/1"
            data={displayImage}
            loading={loading}
            sizes="(min-width: 45em) 400px, 100vw"
          />
        )}
        {isLowStock && <p className="low-stock-badge">Low Stock</p>}
      </div>
      <div className="product-title-container">
        <p>{product.title}</p>
        <Money data={product.priceRange.minVariantPrice} />
      </div>

      {colorOption && colorValues.length > 1 && (
        <div className="product-swatches">
          {visibleSwatches.map((optionValue) => {
            const swatch = optionValue.swatch;
            const variantImage = optionValue.firstSelectableVariant?.image;

            return (
              <div
                key={optionValue.name}
                className="swatch"
                onMouseEnter={() =>
                  variantImage && setHoveredImage(variantImage)
                }
                onMouseLeave={() => setHoveredImage(null)}
                style={{
                  backgroundColor: swatch?.color || '#e5e5e5',
                  backgroundImage: swatch?.image?.previewImage?.url
                    ? `url(${swatch.image.previewImage.url})`
                    : 'none',
                }}
                title={optionValue.name}
              />
            );
          })}
          {remainingCount > 0 && (
            <div className="swatch-count">+{remainingCount}</div>
          )}
        </div>
      )}
    </Link>
  );
}
