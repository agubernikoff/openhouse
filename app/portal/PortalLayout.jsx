import {Suspense} from 'react';
import {Await, Form, Link, Navigate, useLocation} from 'react-router';
import {isPortalPath} from '~/lib/portals';

/**
 * Layout for franchise portal hosts, used in place of the main site's
 * PageLayout (header/footer/pop-ups).
 * @param {{
 *   portal: {handle: string; name: string};
 *   isLoggedIn: Promise<boolean>;
 *   children?: React.ReactNode;
 * }}
 */
export function PortalLayout({portal, isLoggedIn, children = null}) {
  const {pathname} = useLocation();

  // The root loader redirects non-portal paths on full page loads, but it
  // doesn't revalidate on client-side navigations, so guard those here too.
  if (!isPortalPath(pathname)) return <Navigate to="/" replace />;

  return (
    <div className="portal" data-portal={portal.handle}>
      <header className="portal-header">
        <Link to="/" className="portal-header-brand">
          {portal.name}
          <span className="portal-header-byline">by Openhouse</span>
        </Link>
        <nav className="portal-header-nav" aria-label="Portal">
          <Suspense fallback={null}>
            <Await resolve={isLoggedIn} errorElement={null}>
              {(loggedIn) =>
                loggedIn ? (
                  <>
                    <Link to="/account">Account</Link>
                    <Form method="POST" action="/account/logout">
                      <button type="submit">Sign out</button>
                    </Form>
                  </>
                ) : (
                  <Link to="/account/login">Sign in</Link>
                )
              }
            </Await>
          </Suspense>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="portal-main">
        {children}
      </main>
    </div>
  );
}
