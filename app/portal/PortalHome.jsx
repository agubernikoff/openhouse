import {Link} from 'react-router';

/**
 * Portal landing page for logged-out and pending customers. Members are
 * redirected to the catalog (the portal's collection) by the index loader.
 * @param {{
 *   portal: ReturnType<typeof import('~/lib/portals').toPublicPortal>;
 *   role: 'pending' | 'revoked' | null;
 * }}
 */
export function PortalHome({portal, role}) {
  const {copy, logos} = portal;

  if (role === 'revoked') {
    return (
      <section className="portal-home">
        <h1>Your access has been removed</h1>
        <p className="portal-home-body">
          Your {portal.name} ordering access is no longer active. If you think
          this is a mistake, please contact your {portal.name} team.
        </p>
      </section>
    );
  }

  if (role === 'pending') {
    return (
      <section className="portal-home">
        <h1>Thanks, you&rsquo;re all signed up</h1>
        <p className="portal-home-body">{copy.pendingMessage}</p>
      </section>
    );
  }

  return (
    <section className="portal-home">
      {logos.landing && (
        <img
          className="portal-landing-logo"
          src={logos.landing.url}
          alt={portal.name}
          width={logos.landing.width}
          height={logos.landing.height}
        />
      )}
      <h1>{copy.landingHeadline}</h1>
      <p className="portal-home-body">{copy.landingBody}</p>
      <Link to="/account/login" className="portal-button">
        Sign in / Sign up
      </Link>
    </section>
  );
}
