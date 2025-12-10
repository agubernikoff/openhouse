import {Suspense, useState} from 'react';
import {Await, NavLink, useLocation} from 'react-router';
import normalizeMetaobject from '~/helpers/normalizeMetaobject';
import {Logo} from './Logo';
import {motion} from 'motion/react';
import bg from 'app/assets/testi-bg.png';

/**
 * @param {FooterProps}
 */
export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
  testimonials,
}) {
  const {pathname} = useLocation();
  const hideTestimonials = [
    '/collections',
    '/products',
    '/blogs',
    '/cart',
    '/contact',
  ].some((prefix) => pathname.startsWith(prefix));
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="footer">
            {!hideTestimonials && <Testimonials data={testimonials} />}
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

                <div className="footer-divider"></div>

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

function Testimonials({data}) {
  const [index, setIndex] = useState(1);

  function prev() {
    setIndex(index + 1);
  }

  function next() {
    setIndex(index - 1);
  }
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Await resolve={data}>
        {(d) => {
          const fields = normalizeMetaobject(d.metaobject);
          return (
            <section
              className="home-featured-collection"
              style={{
                backgroundImage: `url(${bg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div>
                <p className="red-dot">TESTIMONIALS</p>
              </div>
              <div className="subgrid home-featured-products-grid">
                <h3>{fields?.header?.value}</h3>
              </div>
              <div>
                <motion.div
                  className="testimonials-container"
                  initial={{x: `var(--init-testi-transform)`}}
                  animate={{x: `calc(${index} * var(--unit-testi-transform))`}}
                  transition={{ease: 'easeInOut'}}
                >
                  {fields?.testimonials?.references?.nodes?.map((testi, i) => {
                    const fieldz = normalizeMetaobject(testi);
                    return (
                      <div
                        className={`testimonial ${i === Math.abs(index - 1) ? 'selected' : ''}`}
                        key={testi.id}
                      >
                        <p>{`"${fieldz?.testimonial?.value}"`}</p>
                        <p className="red-dot">{`${fieldz?.person?.value}${fieldz?.company?.value ? ` - ${fieldz.company.value}` : ''}`}</p>
                      </div>
                    );
                  })}
                </motion.div>
              </div>
              <div>
                <button
                  className="carousel-btn left"
                  onClick={prev}
                  disabled={index === 1}
                >
                  <svg
                    width="32"
                    height="15"
                    viewBox="0 0 32 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0.292892 8.07112C-0.0976295 7.6806 -0.0976295 7.04743 0.292892 6.65691L6.65685 0.292946C7.04738 -0.0975785 7.68054 -0.0975785 8.07107 0.292946C8.46159 0.68347 8.46159 1.31664 8.07107 1.70716L2.41421 7.36401L8.07107 13.0209C8.46159 13.4114 8.46159 14.0446 8.07107 14.4351C7.68054 14.8256 7.04738 14.8256 6.65685 14.4351L0.292892 8.07112ZM32 7.36401V8.36401H1V7.36401V6.36401H32V7.36401Z"
                      fill="#2D2D2B"
                    />
                  </svg>
                </button>
                <button
                  className="carousel-btn right"
                  onClick={next}
                  disabled={
                    index * -1 ===
                    fields?.testimonials?.references?.nodes.length - 2
                  }
                >
                  <svg
                    width="32"
                    height="15"
                    viewBox="0 0 32 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M31.7071 8.07112C32.0976 7.6806 32.0976 7.04743 31.7071 6.65691L25.3431 0.292946C24.9526 -0.0975785 24.3195 -0.0975785 23.9289 0.292946C23.5384 0.68347 23.5384 1.31664 23.9289 1.70716L29.5858 7.36401L23.9289 13.0209C23.5384 13.4114 23.5384 14.0446 23.9289 14.4351C24.3195 14.8256 24.9526 14.8256 25.3431 14.4351L31.7071 8.07112ZM0 7.36401V8.36401H31V7.36401V6.36401H0V7.36401Z"
                      fill="#2D2D2B"
                    />
                  </svg>
                </button>
              </div>
            </section>
          );
        }}
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
          id="email"
          type="email"
          placeholder="Email"
          className="footer-newsletter-input"
          required
          autoComplete="off"
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
                      ? new URL(item.url).pathname + new URL(item.url).hash
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
