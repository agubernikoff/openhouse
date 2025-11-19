import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import {Logo} from './Logo';

/**
 * @param {FooterProps}
 */
export function Footer({footer: footerPromise, header, publicStoreDomain}) {
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="footer">
            {/* Hero Image Section */}
            {footer?.metaobject && (
              <FooterHero metaobject={footer.metaobject} />
            )}

            {/* Content Section with 50/50 split */}
            <div className="footer-content-wrapper">
              <div className="footer-content">
                <div className="footer-content-left">
                  <p className="footer-content-title">
                    Exceptional Design.
                    <br />
                    Industry-Leading Quality.
                  </p>
                </div>

                {/* Menu Columns */}
                {footer?.menu && header.shop.primaryDomain?.url && (
                  <FooterMenu
                    menu={footer.menu}
                    primaryDomainUrl={header.shop.primaryDomain.url}
                    publicStoreDomain={publicStoreDomain}
                  />
                )}
              </div>

              {/* Newsletter Section (overlapping at bottom) */}
              <div className="footer-newsletter-wrapper">
                <FooterNewsletter />
              </div>
            </div>

            {/* Legal Bar */}
            <div className="footer-legal-bar">
              <div className="footer-legal-left">
                <a href="/policies/privacy-policy">Privacy Policy</a>
                <a href="/policies/terms-of-service">Terms & Conditions</a>
              </div>
              <div className="footer-legal-right">
                © {new Date().getFullYear()} Openhouse Inc. All rights
                reserved.
              </div>
            </div>

            {/* Large Branding */}
            <div className="footer-branding">
              <Logo className="footer-logo" />
            </div>
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

/**
 * Footer Hero Section with Image
 */
function FooterHero({metaobject}) {
  const imageField = metaobject.fields.find((field) => field.key === 'image');
  const imageUrl = imageField?.reference?.image?.url;
  const altText = imageField?.reference?.image?.altText || 'Footer hero image';

  return (
    <div className="footer-hero">
      {imageUrl && (
        <>
          <img src={imageUrl} alt={altText} className="footer-hero-image" />
          <div className="footer-hero-content">
            <p className="footer-hero-title">
              Crafting Lasting Merchandise
              <br />
              for Brands that Care
            </p>
            <a href="/collections/all" className="footer-hero-button">
              EXPLORE ALL
            </a>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Newsletter Section
 */
function FooterNewsletter() {
  return (
    <div className="footer-newsletter">
      <p className="footer-newsletter-title">Newsletter</p>
      <p className="footer-newsletter-description">
        Let's get connected. Reach out about a project, collaboration or just to
        say hello!
      </p>
      <form className="footer-newsletter-form">
        <input
          type="email"
          placeholder="Email"
          className="footer-newsletter-input"
          required
        />
        <button type="submit" className="footer-newsletter-button">
          SUBSCRIBE
        </button>
      </form>
    </div>
  );
}

/**
 * Footer Menu with Submenu Support
 */
function FooterMenu({menu, primaryDomainUrl, publicStoreDomain}) {
  const menuCategories = (menu || FALLBACK_FOOTER_MENU).items;

  return (
    <div className="footer-menu-right">
      <div className="footer-menu-grid">
        {menuCategories.map((category) => (
          <div key={category.id} className="footer-menu-column">
            <p className="footer-menu-heading">{category.title}</p>
            {category.items && category.items.length > 0 && (
              <ul className="footer-menu-list">
                {category.items.map((item) => {
                  if (!item.url) return null;
                  const url =
                    item.url.includes('myshopify.com') ||
                    item.url.includes(publicStoreDomain) ||
                    item.url.includes(primaryDomainUrl)
                      ? new URL(item.url).pathname
                      : item.url;
                  const isExternal = !url.startsWith('/');

                  return (
                    <li key={item.id}>
                      {isExternal ? (
                        <a href={url} rel="noopener noreferrer" target="_blank">
                          {item.title}
                        </a>
                      ) : (
                        <NavLink to={url} prefetch="intent">
                          {item.title}
                        </NavLink>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Privacy Policy',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Refund Policy',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Shipping Policy',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'Terms of Service',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
};

/**
 * @typedef {Object} FooterProps
 * @property {Promise<FooterQuery|null>} footer
 * @property {HeaderQuery} header
 * @property {string} publicStoreDomain
 */

/** @typedef {import('storefrontapi.generated').FooterQuery} FooterQuery */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
