import {HydratedRouter} from 'react-router/dom';
import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {NonceProvider} from '@shopify/hydrogen';

if (!window.location.origin.includes('webcache.googleusercontent.com')) {
  // Initialize Google Tag Manager
  const gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=AW-11431963526';
  const existingNonce = document.querySelector('script[nonce]')?.nonce;
  if (existingNonce) gtagScript.nonce = existingNonce;
  document.head.appendChild(gtagScript);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', 'AW-11431963526');

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
