const ADMIN_API_VERSION = '2026-07';

let cachedToken = null;
let cachedTokenExpiresAt = 0;

/**
 * Exchanges the custom app's client credentials for an Admin API access
 * token, caching it in memory for the life of the worker isolate. Tokens
 * are valid for 24h; refreshed a minute early to avoid edge-of-expiry 401s.
 * @param {Env} env
 */
async function getAdminAccessToken(env) {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const response = await fetch(
    `https://${env.PUBLIC_STORE_DOMAIN}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.SHOPIFY_ADMIN_CLIENT_ID,
        client_secret: env.SHOPIFY_ADMIN_CLIENT_SECRET,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Shopify admin access token: ${response.status}`,
    );
  }

  const {access_token, expires_in} = await response.json();
  cachedToken = access_token;
  cachedTokenExpiresAt = Date.now() + expires_in * 1000;
  return cachedToken;
}

/**
 * Runs a query/mutation against the Shopify Admin GraphQL API using a
 * client-credentials access token.
 * @param {Env} env
 * @param {{query: string, variables?: Record<string, unknown>}} params
 */
export async function shopifyAdminFetch(env, {query, variables}) {
  const accessToken = await getAdminAccessToken(env);

  const response = await fetch(
    `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({query, variables}),
    },
  );

  const json = await response.json();

  if (!response.ok || json.errors) {
    throw new Error(
      `Shopify Admin API error: ${JSON.stringify(json.errors ?? json)}`,
    );
  }

  return json.data;
}
