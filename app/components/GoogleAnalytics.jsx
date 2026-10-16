import {useEffect} from 'react';
import {flattenConnection, useAnalytics} from '@shopify/hydrogen';
import {gtag, sendGA4Event} from '~/lib/analytics';

/**
 * Forwards Hydrogen analytics events to GA4.
 *
 * Hydrogen only publishes events once the Customer Privacy API reports that
 * analytics processing is allowed, so nothing here fires without consent.
 *
 * begin_checkout and purchase are deliberately not sent: checkout lives on
 * checkout.byopenhouse.com and is tracked by Shopify's Google & YouTube app.
 */
export function GoogleAnalytics() {
  const {subscribe, register, customerPrivacy} = useAnalytics();
  const {ready} = register('GoogleAnalytics');

  // Mirror Shopify's consent state into Google Consent Mode
  useEffect(() => {
    if (!customerPrivacy) return;

    updateConsent({
      analyticsAllowed: customerPrivacy.analyticsProcessingAllowed(),
      marketingAllowed: customerPrivacy.marketingAllowed(),
    });

    const onConsentCollected = (event) => updateConsent(event.detail);
    document.addEventListener('visitorConsentCollected', onConsentCollected);
    return () =>
      document.removeEventListener(
        'visitorConsentCollected',
        onConsentCollected,
      );
  }, [customerPrivacy]);

  useEffect(() => {
    subscribe('page_viewed', ({url}) => {
      sendGA4Event('page_view', {
        page_location: url,
        page_title: document.title,
      });
    });

    subscribe('product_viewed', ({products, shop}) => {
      const items = products.map((product) => ({
        item_id: itemId(product.id, product.variantId),
        item_name: product.title,
        item_brand: product.vendor,
        item_variant: product.variantTitle,
        price: Number(product.price),
        quantity: product.quantity,
      }));
      sendGA4Event('view_item', {
        currency: shop?.currency,
        value: sumItems(items),
        items,
      });
    });

    subscribe('collection_viewed', ({collection}) => {
      sendGA4Event('view_item_list', {
        item_list_id: shopifyId(collection.id),
        item_list_name: collection.handle,
      });
    });

    subscribe('search_viewed', ({searchTerm}) => {
      if (!searchTerm) return;
      sendGA4Event('search', {search_term: searchTerm});
    });

    subscribe('cart_viewed', ({cart}) => {
      if (!cart) return;
      const items = cartLines(cart).map((line) => lineToItem(line));
      sendGA4Event('view_cart', {
        currency: cart.cost?.subtotalAmount?.currencyCode,
        value: Number(cart.cost?.subtotalAmount?.amount ?? 0),
        items,
      });
    });

    subscribe('product_added_to_cart', ({currentLine, prevLine}) => {
      const quantity = currentLine.quantity - (prevLine?.quantity ?? 0);
      const item = lineToItem(currentLine, quantity);
      sendGA4Event('add_to_cart', {
        currency: currentLine.merchandise.price.currencyCode,
        value: item.price * quantity,
        items: [item],
      });
    });

    subscribe('product_removed_from_cart', ({currentLine, prevLine}) => {
      const quantity = prevLine.quantity - (currentLine?.quantity ?? 0);
      const item = lineToItem(prevLine, quantity);
      sendGA4Event('remove_from_cart', {
        currency: prevLine.merchandise.price.currencyCode,
        value: item.price * quantity,
        items: [item],
      });
    });

    ready();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function updateConsent({analyticsAllowed, marketingAllowed}) {
  const marketing = marketingAllowed ? 'granted' : 'denied';
  gtag('consent', 'update', {
    analytics_storage: analyticsAllowed ? 'granted' : 'denied',
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  });
}

/** gid://shopify/Product/123 → 123 */
function shopifyId(gid = '') {
  return gid.split('/').pop();
}

/**
 * Matches the item_id format Shopify's Google & YouTube app sends from
 * checkout (e.g. shopify_ZZ_8908229443823_46301938712815), so storefront
 * views/add-to-carts and checkout purchases land on the same item in GA4.
 */
function itemId(productGid, variantGid) {
  return `shopify_ZZ_${shopifyId(productGid)}_${shopifyId(variantGid)}`;
}

function cartLines(cart) {
  return cart.lines ? flattenConnection(cart.lines) : [];
}

function lineToItem(line, quantity = line.quantity) {
  const {merchandise} = line;
  return {
    item_id: itemId(merchandise.product.id, merchandise.id),
    item_name: merchandise.product.title,
    item_brand: merchandise.product.vendor,
    item_variant: merchandise.title,
    price: Number(merchandise.price.amount),
    quantity,
  };
}

function sumItems(items) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
