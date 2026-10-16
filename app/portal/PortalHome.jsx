import {Link} from 'react-router';

/**
 * Portal landing page. What it shows depends on the customer's portal role
 * (portal/access.server.js); the catalog (plan §4.4) replaces the member view.
 * @param {{
 *   portal: {handle: string; name: string};
 *   role: 'admin' | 'member' | 'pending' | null;
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

  if (role === 'member' || role === 'admin') {
    return (
      <section className="portal-home">
        <h1>{portal.name} ordering portal</h1>
        <p>You&rsquo;re verified. The catalog is coming soon.</p>
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
