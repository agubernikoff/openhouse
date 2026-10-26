import {Link} from 'react-router';

/**
 * Portal landing page for logged-out and pending customers. Members are
 * redirected to the catalog (the portal's collection) by the index loader.
 * @param {{
 *   portal: {handle: string; name: string};
 *   role: 'pending' | null;
 * }}
 */
export function PortalHome({portal, role}) {
  if (role === 'pending') {
    return (
      <section className="portal-home">
        <h1>Thanks — you&rsquo;re all signed up</h1>
        <p>
          Openhouse is verifying your {portal.name} account. You&rsquo;ll be
          able to place orders as soon as it&rsquo;s approved.
        </p>
      </section>
    );
  }

  return (
    <section className="portal-home">
      <h1>{portal.name} ordering portal</h1>
      <p>
        Sign in or create an account to order approved {portal.name}{' '}
        merchandise.
      </p>
      <Link to="/account/login" className="portal-button">
        Sign in / Sign up
      </Link>
    </section>
  );
}
