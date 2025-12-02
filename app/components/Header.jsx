import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {useAnalytics, useOptimisticCart} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
import {CartMain} from '~/components/CartMain';

/**
 * @param {HeaderProps}
 */
export function Header({header, isLoggedIn, cart, publicStoreDomain}) {
  const {shop, menu} = header;
  const {type, close} = useAside();
  const isCartOpen = type === 'cart';

  return (
    <>
      <header className="header">
        <HeaderMenu
          menu={menu}
          viewport="desktop"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
        <NavLink prefetch="intent" to="/" style={activeLinkStyle} end>
          <Logo />
        </NavLink>
        <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
      </header>
      {isCartOpen && (
        <div className="cart-dropdown-overlay" onClick={close}>
          <div
            className="cart-dropdown-content"
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense fallback={<p>Loading cart...</p>}>
              <Await resolve={cart}>
                {(cart) => <CartMain layout="aside" cart={cart} />}
              </Await>
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}

// ... rest of the header code stays the same

/**
 * @param {{
 *   menu: HeaderProps['header']['menu'];
 *   primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
 *   viewport: Viewport;
 *   publicStoreDomain: HeaderProps['publicStoreDomain'];
 * }}
 */
export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}) {
  const className = `header-menu-${viewport}`;
  const {close} = useAside();

  return (
    <nav className={className} role="navigation">
      {viewport === 'mobile' && (
        <NavLink
          end
          onClick={close}
          prefetch="intent"
          style={activeLinkStyle}
          to="/"
        >
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;

        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        return (
          <NavLink
            className="header-menu-item"
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

/**
 * @param {Pick<HeaderProps, 'isLoggedIn' | 'cart'>}
 */
function HeaderCtas({isLoggedIn, cart}) {
  return (
    <nav className="header-ctas" role="navigation">
      <HeaderMenuMobileToggle />
      <NavLink prefetch="intent" to="/contact" style={activeLinkStyle}>
        {/* <Suspense fallback="Sign in">
          <Await resolve={isLoggedIn} errorElement="Sign in">
            {(isLoggedIn) => (isLoggedIn ? 'Account' : 'Sign in')}
          </Await>
        </Suspense> */}
        Contact
      </NavLink>
      <CartToggle cart={cart} />
      <SearchToggle />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
    >
      <h3>☰</h3>
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button className="reset" onClick={() => open('search')}>
      Search
      <svg
        width="13"
        height="14"
        viewBox="0 0 13 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_2048_210)">
          <path
            d="M5.43693 10.6117C8.02535 10.6117 10.1236 8.51341 10.1236 5.92499C10.1236 3.3366 8.02535 1.2383 5.43693 1.2383C2.84855 1.2383 0.750244 3.3366 0.750244 5.92499C0.750244 8.51341 2.84855 10.6117 5.43693 10.6117Z"
            stroke="#2D2D2B"
          />
          <path d="M12.2146 12.7748L8.68158 9.31382" stroke="#2D2D2B" />
        </g>
        <defs>
          <clipPath id="clip0_2048_210">
            <rect width="13" height="14" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </button>
  );
}

/**
 * @param {{count: number | null}}
 */
function CartBadge({count}) {
  const {open, close, type} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();
  const isCartOpen = type === 'cart';

  return (
    <a
      href="/cart"
      onClick={(e) => {
        if (window.location.pathname === '/cart') {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        if (isCartOpen) {
          close();
        } else {
          open('cart');
          publish('cart_viewed', {
            cart,
            prevCart,
            shop,
            url: window.location.href || '',
          });
        }
      }}
      className="cart-link"
    >
      Cart <span>{count === null ? 0 : count}</span>
    </a>
  );
}

/**
 * @param {Pick<HeaderProps, 'cart'>}
 */
function CartToggle({cart}) {
  return (
    <Suspense fallback={<CartBadge count={null} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue();
  const cart = useOptimisticCart(originalCart);
  const itemCount = cart?.lines?.nodes?.length ?? cart?.lines?.length ?? 0;
  return <CartBadge count={itemCount} />;
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

/**
 * @param {{
 *   isActive: boolean;
 *   isPending: boolean;
 * }}
 */
function activeLinkStyle({isActive, isPending}) {
  return {
    fontWeight: isActive ? null : undefined,
    color: isPending ? 'var(--color-oh-grey)' : 'var(--color-oh-black)',
  };
}

/** @typedef {'desktop' | 'mobile'} Viewport */
/**
 * @typedef {Object} HeaderProps
 * @property {HeaderQuery} header
 * @property {Promise<CartApiQueryFragment|null>} cart
 * @property {Promise<boolean>} isLoggedIn
 * @property {string} publicStoreDomain
 */

/** @typedef {import('@shopify/hydrogen').CartViewPayload} CartViewPayload */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */

function Logo() {
  return (
    <svg
      width="132"
      height="16"
      viewBox="0 0 132 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_2048_184)">
        <path
          d="M0.190186 7.86344C0.190186 3.46752 3.25503 0.264725 7.49435 0.264725C11.7337 0.264725 14.7985 3.46752 14.7985 7.86344C14.7985 12.2594 11.7337 15.4584 7.49435 15.4584C3.25503 15.4584 0.190186 12.2556 0.190186 7.86344ZM7.49435 12.2146C9.68299 12.2146 11.2825 10.3429 11.2825 7.8187C11.2825 5.2945 9.68299 3.42278 7.49435 3.42278C5.30571 3.42278 3.70618 5.24975 3.70618 7.8187C3.70618 10.3877 5.30571 12.2146 7.49435 12.2146Z"
          fill="#2D2D2B"
        />
        <path
          d="M16.9946 0.536896H23.9371C26.7111 0.536896 28.717 2.52047 28.717 5.27211C28.717 8.02376 26.5992 9.96259 23.6686 9.96259H20.3316V15.1937H16.9946V0.540622V0.536896ZM23.3517 7.52414C24.433 7.52414 25.201 6.68895 25.201 5.54057C25.201 4.39218 24.433 3.55699 23.3517 3.55699H20.3316V7.52414H23.3517Z"
          fill="#2D2D2B"
        />
        <path
          d="M30.9244 0.536896H41.3829V3.55699H34.2614V6.53235H40.1226V8.87759H34.2614V12.1251H41.6551V15.19H30.9244V0.536896Z"
          fill="#2D2D2B"
        />
        <path
          d="M44.6191 0.536896H48.4073L53.6384 10.2758V0.536896H56.9754V15.19H53.37L47.9599 5.27211V15.19H44.6229V0.536896H44.6191Z"
          fill="#2D2D2B"
        />
        <path
          d="M63.6495 0.536896V6.35338H69.4212V0.536896H72.7582V15.19H69.4212V9.05656H63.6495V15.19H60.3124V0.536896H63.6495Z"
          fill="#2D2D2B"
        />
        <path
          d="M74.9731 7.86344C74.9731 3.46752 78.038 0.264725 82.2773 0.264725C86.5166 0.264725 89.5815 3.46752 89.5815 7.86344C89.5815 12.2594 86.5166 15.4584 82.2773 15.4584C78.038 15.4584 74.9731 12.2556 74.9731 7.86344ZM82.2773 12.2146C84.466 12.2146 86.0655 10.3429 86.0655 7.8187C86.0655 5.2945 84.466 3.42278 82.2773 3.42278C80.0887 3.42278 78.4891 5.24975 78.4891 7.8187C78.4891 10.3877 80.0887 12.2146 82.2773 12.2146Z"
          fill="#2D2D2B"
        />
        <path
          d="M91.7999 0.536896H95.137V9.05656C95.137 10.8835 96.2853 12.2146 97.8886 12.2146C99.4919 12.2146 100.64 10.8835 100.64 9.05656V0.536896H103.977V9.14977C103.977 12.8 101.431 15.4622 97.8923 15.4622C94.354 15.4622 91.8074 12.8037 91.8074 9.14977V0.536896H91.7999Z"
          fill="#2D2D2B"
        />
        <path
          d="M112.87 12.4831C113.973 12.4831 115.032 12.0319 115.032 11.0401C115.032 8.24375 106.736 9.05657 106.736 4.36609C106.736 1.97611 108.854 0.264725 112.146 0.264725C115.439 0.264725 118.187 1.95747 118.369 4.27661L114.581 5.17891C114.492 4.00816 113.545 3.1506 112.236 3.1506C111.132 3.1506 110.252 3.75835 110.252 4.59353C110.252 7.25197 118.638 6.44288 118.638 11.1296C118.638 13.6762 116.181 15.4584 112.687 15.4584C109.193 15.4584 106.285 13.4972 106.196 10.8388L110.073 10.026C110.163 11.4466 111.177 12.4831 112.87 12.4831Z"
          fill="#2D2D2B"
        />
        <path
          d="M120.722 0.536896H131.181V3.55699H124.059V6.53235H129.92V8.87759H124.059V12.1251H131.453V15.19H120.722V0.536896Z"
          fill="#2D2D2B"
        />
      </g>
      <defs>
        <clipPath id="clip0_2048_184">
          <rect width="131.617" height="15.6598" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
