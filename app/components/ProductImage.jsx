import {Image} from '@shopify/hydrogen';

/**
 * @param {{
 *   image: ProductVariantFragment['image'];
 * }}
 */
export function ProductImage({image, hidden}) {
  if (!image) {
    return <div className="product-image" />;
  }
  return (
    <div
      className="product-image"
      style={hidden ? {opacity: 0, position: 'absolute', zIndex: '-1'} : {}}
    >
      <Image
        alt={image.altText || 'Product Image'}
        // aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
      />
    </div>
  );
}

/** @typedef {import('storefrontapi.generated').ProductVariantFragment} ProductVariantFragment */
