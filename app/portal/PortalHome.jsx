import {Link} from 'react-router';

/**
 * Portal landing page. Placeholder until the catalog (plan §4.4) lands.
 * @param {{
 *   portal: {handle: string; name: string};
 *   isLoggedIn: boolean;
 * }}
 */
export function PortalHome({portal, isLoggedIn}) {
  return (
    <section className="portal-home">
      <h1>{portal.name} ordering portal</h1>
      {isLoggedIn ? (
        <p>You&rsquo;re signed in. The catalog is coming soon.</p>
      ) : (
        <>
          <p>
            Sign in or create an account to order approved {portal.name}{' '}
            merchandise.
          </p>
          <Link to="/account/login" className="portal-button">
            Sign in / Sign up
          </Link>
        </>
      )}
    </section>
  );
}
