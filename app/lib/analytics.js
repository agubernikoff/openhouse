export const GA4_MEASUREMENT_ID = 'G-B5G8H2Y86L';
export const GOOGLE_ADS_ID = 'AW-11431963526';

/**
 * Only the live storefront reports to GA4 — local dev and Oxygen preview
 * deployments log events to the console instead of polluting the property.
 */
export function isProductionHost() {
  const {hostname} = window.location;
  return (
    hostname === 'byopenhouse.com' || hostname.endsWith('.byopenhouse.com')
  );
}

export function gtag() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(arguments);
}

/**
 * Sends an event to GA4 only. `send_to` keeps these out of the Google Ads tag,
 * which shares the same gtag.js instance.
 */
export function sendGA4Event(name, params) {
  if (!isProductionHost()) {
    // eslint-disable-next-line no-console
    console.debug('[ga4]', name, params);
    return;
  }
  gtag('event', name, {...params, send_to: GA4_MEASUREMENT_ID});
}
