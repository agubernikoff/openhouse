import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';

/**
 * @param {Request} request
 * @param {number} responseStatusCode
 * @param {Headers} responseHeaders
 * @param {EntryContext} reactRouterContext
 * @param {HydrogenRouterContextProvider} context
 */
export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
  context,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    defaultSrc: ["'self'"],
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    imgSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://openhouse.store',
      'https://openhouse-custom-artwork.s3.us-east-1.amazonaws.com',
      'blob:',
      'data:',
      'https://checkout.byopenhouse.com/',
    ],
    connectSrc: [
      "'self'",
      'https://openhouse-custom-artwork.s3.us-east-1.amazonaws.com',
      'https://s3.us-east-1.amazonaws.com',
      'https://api.emailjs.com',
      'https://cdn.shopify.com',
      'https://monorail-edge.shopifysvc.com',
    ],
    scriptSrc: [
      "'self'",
      'https://cdn.emailjs.com',
      'https://cdn.shopify.com',
      'https://b2bjsstore.s3.us-west-2.amazonaws.com',
    ],
    mediaSrc: [
      'https://openhouse.store/',
      'https://openhouse-custom-artwork.s3.us-east-1.amazonaws.com',
      'https://w8kbyy-ez.myshopify.com/',
      'https://checkout.byopenhouse.com/',
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

/** @typedef {import('@shopify/hydrogen').HydrogenRouterContextProvider} HydrogenRouterContextProvider */
/** @typedef {import('react-router').EntryContext} EntryContext */
