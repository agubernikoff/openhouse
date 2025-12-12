import {useLoaderData, data} from 'react-router';
import {CartForm} from '@shopify/hydrogen';
import {CartMain} from '~/components/CartMain';
import {ProductItem} from '~/components/ProductItem';
import {useState, useEffect} from 'react';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: `Hydrogen | Cart`}];
};

/**
 * @type {HeadersFunction}
 */
export const headers = ({actionHeaders}) => actionHeaders;

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  // Handle special instructions note update
  if (!action) {
    const note = formData.get('note');
    if (note !== null) {
      const result = await cart.updateNote(note);
      const cartId = result?.cart?.id;
      const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();

      return data(
        {
          cart: result.cart,
          errors: result.errors,
          warnings: result.warnings,
          analytics: {
            cartId,
          },
        },
        {status: 200, headers},
      );
    }
    throw new Error('No action provided');
  }

  let status = 200;
  let result;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = formDiscountCode ? [formDiscountCode] : [];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;

      // User inputted gift card code
      const giftCardCodes = formGiftCardCode ? [formGiftCardCode] : [];

      // Combine gift card codes already applied on cart
      giftCardCodes.push(...inputs.giftCardCodes);

      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      const appliedGiftCardIds = inputs.giftCardCodes;
      result = await cart.removeGiftCardCodes(appliedGiftCardIds);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  const {cart, storefront} = context;

  // Get cart data
  const cartData = await cart.get();

  // Get product recommendations based on cart items
  let productHandles = [];
  if (cartData?.lines?.nodes?.length > 0) {
    productHandles = cartData.lines.nodes
      .map((line) => line.merchandise?.product?.handle)
      .filter(Boolean)
      .slice(0, 3); // Get handles from first 3 items
  }

  // Fetch recommendations for cart products
  const recommendationsPromises = productHandles.map((handle) =>
    storefront.query(PRODUCT_RECOMMENDATIONS_QUERY, {
      variables: {handle},
    }),
  );

  const recommendations = await Promise.all(recommendationsPromises);

  return {
    cart: cartData,
    recommendations,
  };
}

export default function Cart() {
  /** @type {LoaderReturnData} */
  const {cart, recommendations} = useLoaderData();

  return (
    <>
      <section className="home-featured-collection">
        <div>
          <p className="red-dot">CART</p>
        </div>
        <div className="subgrid home-featured-products-grid">
          <CartMain layout="page" cart={cart} />
        </div>
      </section>
      <YouMayAlsoLike recommendations={recommendations} />
    </>
  );
}

function YouMayAlsoLike({recommendations}) {
  const [uniqueProducts, setUniqueProducts] = useState([]);

  useEffect(() => {
    // Flatten all recommendations and remove duplicates
    const allProducts = recommendations
      .flatMap((rec) => rec?.productRecommendations || [])
      .filter((p) => p?.id);

    const unique = [
      ...new Map(allProducts.map((p) => [p.id, p])).values(),
    ].slice(0, 4);

    setUniqueProducts(unique);
  }, [recommendations]);

  if (uniqueProducts.length === 0) {
    return null;
  }

  return (
    <section className="home-featured-collection you-may-also-like">
      <div>
        <p className="red-dot">YOU MAY ALSO LIKE</p>
      </div>
      <div className="subgrid products-grid">
        {uniqueProducts.map((product, index) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 3 ? 'eager' : undefined}
          />
        ))}
      </div>
    </section>
  );
}

/** @typedef {import('react-router').HeadersFunction} HeadersFunction */
/** @typedef {import('./+types/cart').Route} Route */
/** @typedef {import('@shopify/hydrogen').CartQueryDataReturn} CartQueryDataReturn */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    variants(first: 1) {
      nodes {
        selectedOptions {
          name
          value
        }
      }
    }
  }
`;

const PRODUCT_RECOMMENDATIONS_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query ProductRecommendations(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productHandle: $handle) {
      ...ProductItem
    }
  }
`;
