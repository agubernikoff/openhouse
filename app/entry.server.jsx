export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
  context,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    mediaSrc: ['https://openhouse.store'],
    imgSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://openhouse.store',
      'https://openhouse-custom-artwork.s3.us-east-1.amazonaws.com', // Add your S3 bucket
      'blob:',
      'data:',
    ],
    // ADD THIS - Critical for API calls to S3
    connectSrc: [
      "'self'",
      'https://openhouse-custom-artwork.s3.us-east-1.amazonaws.com',
      'https://s3.us-east-1.amazonaws.com', // Some AWS SDK calls go to regional endpoint
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
