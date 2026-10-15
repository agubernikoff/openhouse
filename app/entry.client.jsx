import {HydratedRouter} from 'react-router/dom';
import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {NonceProvider} from '@shopify/hydrogen';
import {
  GA4_MEASUREMENT_ID,
  GOOGLE_ADS_ID,
  gtag,
  isProductionHost,
} from '~/lib/analytics';

if (!window.location.origin.includes('webcache.googleusercontent.com')) {
  // Initialize Google Tag Manager
  const gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  const existingNonce = document.querySelector('script[nonce]')?.nonce;
  if (existingNonce) gtagScript.nonce = existingNonce;
  document.head.appendChild(gtagScript);

  // Consent Mode: deny until Shopify's Customer Privacy API reports the
  // visitor's choice (see components/GoogleAnalytics.jsx)
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 2000,
  });
  gtag('js', new Date());
  gtag('config', GOOGLE_ADS_ID);
  if (isProductionHost()) {
    // Page views come from Hydrogen's page_viewed event so client-side
    // navigations are counted
    gtag('config', GA4_MEASUREMENT_ID, {send_page_view: false});
  }

  // Prevent image context menu and dragging
  document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      return false;
    }
  });

  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      return false;
    }
  });

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <NonceProvider value={existingNonce}>
          <HydratedRouter />
        </NonceProvider>
      </StrictMode>,
    );
  });
}
