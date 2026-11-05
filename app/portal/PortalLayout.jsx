import {Suspense} from 'react';
import {Await, Form, Link, Navigate, useLocation} from 'react-router';
import {Aside} from '~/components/Aside';
import {isPortalPath} from '~/lib/portals';

/**
 * Layout for franchise portal hosts, used in place of the main site's
 * PageLayout (header/footer/pop-ups).
 * @param {{
 *   portal: ReturnType<typeof import('~/lib/portals').toPublicPortal>;
 *   isLoggedIn: Promise<boolean>;
 *   cart: Promise<any>;
 *   isPortalAdmin: Promise<boolean>;
 *   children?: React.ReactNode;
 * }}
 */
export function PortalLayout({
  portal,
  isLoggedIn,
  isPortalAdmin,
  cart,
  children = null,
}) {
  const {pathname} = useLocation();

  // The root loader redirects non-portal paths on full page loads, but it
  // doesn't revalidate on client-side navigations, so guard those here too.
  if (!isPortalPath(pathname, portal)) return <Navigate to="/" replace />;

  // Aside.Provider: shared cart/product components call useAside(); portals
  // use the cart page rather than the main site's header drawer
  const {logos} = portal;

  return (
    <Aside.Provider>
      <div
        className="portal"
        data-portal={portal.handle}
        style={themeStyle(portal.theme)}
      >
        <header className="portal-header">
          <Link
            to="/"
            className="portal-header-brand"
            aria-label={`${portal.name} home`}
          >
            {logos.header ? (
              <>
                {/* Horizontal logo for headers (brand guide p. 29),
                    min 2.5" ≈ 240px (p. 34) */}
                <img
                  className="portal-logo-wide"
                  src={logos.header.url}
                  alt={portal.name}
                  width={logos.header.width}
                  height={logos.header.height}
                />
                {/* Small screens: monogram with the name in text, which
                    p. 34 requires when the monogram stands alone */}
                {logos.mark && (
                  <img
                    className="portal-logo-mark"
                    src={logos.mark.url}
                    alt=""
                    width={logos.mark.width}
                    height={logos.mark.height}
                  />
                )}
                <span className="portal-header-name">{portal.name}</span>
              </>
            ) : (
              portal.name
            )}
            <span className="portal-header-byline">by Openhouse</span>
          </Link>
          <nav className="portal-header-nav" aria-label="Portal">
            <Suspense fallback={null}>
              <Await resolve={isLoggedIn} errorElement={null}>
                {(loggedIn) =>
                  loggedIn ? (
                    <>
                      <Link to="/cart">
                        Cart
                        <Suspense fallback={null}>
                          <Await resolve={cart} errorElement={null}>
                            {(c) =>
                              c?.totalQuantity ? ` (${c.totalQuantity})` : null
                            }
                          </Await>
                        </Suspense>
                      </Link>
                      <Suspense fallback={null}>
                        <Await resolve={isPortalAdmin} errorElement={null}>
                          {(admin) =>
                            admin ? <Link to="/admin">Admin</Link> : null
                          }
                        </Await>
                      </Suspense>
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
    </Aside.Provider>
  );
}

/**
 * Portal theme (from the portal metaobject, validated in lib/portals.js) as
 * CSS custom properties; app.css maps them onto the shared components.
 */
function themeStyle(theme) {
  return {
    '--portal-text': theme.text,
    '--portal-background': theme.background,
    '--portal-accent': theme.accent,
    '--portal-button': theme.button,
    '--portal-button-text': theme.buttonText,
    '--portal-error': theme.error,
    '--portal-error-background': theme.errorBackground,
    ...(theme.fontFamily && {'--portal-font': `'${theme.fontFamily}'`}),
  };
}
