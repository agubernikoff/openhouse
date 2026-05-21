import {Await, Link} from 'react-router';
import {Suspense, useId, useEffect, useState} from 'react';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import {usePopUp} from '~/context/PopUpContext';
import {motion, AnimatePresence} from 'motion/react';
import normalizeMetaobject from '~/helpers/normalizeMetaobject';
import {Image} from '@shopify/hydrogen';

/**
 * @param {PageLayoutProps}
 */
export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
  testimonials,
  about_image,
  pop_up,
}) {
  const {shouldShowPopup} = usePopUp();
  return (
    <Aside.Provider>
      <AnimatePresence>
        {shouldShowPopup() && <WelcomePopup data={pop_up} />}
      </AnimatePresence>
      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
      {header && (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
          about_image={about_image}
        />
      )}
      <main>{children}</main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
        testimonials={testimonials}
      />
    </Aside.Provider>
  );
}

function WelcomePopup({data}) {
  const {markPopupAsShown, shouldShowPopup} = usePopUp();

  const handleClose = () => {
    setTimeout(() => {
      markPopupAsShown();
    }, 300);
  };

  return (
    <>
      <motion.button
        className="popup-overlay"
        onClick={handleClose}
        aria-label="Close popup"
        tabIndex={0}
        initial={{opacity: 0}}
        animate={{opacity: 0.1, delay: 1}}
        exit={{opacity: 0}}
        transition={{delay: shouldShowPopup() ? 1 : 0}}
      />
      <motion.div
        className="popup-container"
        initial={{opacity: 0}}
        animate={{opacity: 1, delay: 1}}
        exit={{opacity: 0}}
        transition={{delay: shouldShowPopup() ? 1 : 0}}
      >
        {data && (
          <Suspense>
            <Await resolve={data}>
              {(resolved) => {
                const fields = normalizeMetaobject(resolved?.metaobject) ?? {};
                const functionality = fields.functionality?.value ?? null;
                const imageData = fields.image?.reference?.image ?? {
                  image: null,
                };
                const hasContent =
                  fields.heading?.value ||
                  fields.body?.value ||
                  fields.cta_url?.value ||
                  functionality === 'newsletter';

                return (
                  <>
                    <button
                      className={`popup-close ${functionality ? ` popup-close--${functionality}` : ''}`}
                      onClick={handleClose}
                      aria-label="Close popup"
                    >
                      ×
                    </button>
                    {imageData && (
                      <div>
                        <Image data={imageData} sizes="500px" />
                      </div>
                    )}
                    {hasContent && (
                      <div
                        className={`popup-content ${functionality ? ` popup-content--${functionality}` : ''}`}
                      >
                        {fields.heading?.value && (
                          <h2>{fields.heading.value}</h2>
                        )}
                        {fields.body?.value && <p>{fields.body.value}</p>}
                        {functionality === 'newsletter' ? (
                          <form className="popup-newsletter-form">
                            <input type="email" placeholder="Your email" />
                            <button type="submit" aria-label="Subscribe">
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 18 18"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <g transform="translate(0, -1)">
                                  <path
                                    d="M2 9H14"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinecap="square"
                                  />
                                  <path
                                    d="M9 3L15 9L9 15"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinejoin="miter"
                                    strokeLinecap="square"
                                  />
                                </g>
                              </svg>
                            </button>
                          </form>
                        ) : fields.cta_url?.value ? (
                          <a
                            className="explore-all"
                            href={fields.cta_url.value}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {fields.cta_text?.value ?? 'Book a call'}
                          </a>
                        ) : null}
                      </div>
                    )}
                  </>
                );
              }}
            </Await>
          </Suspense>
        )}
      </motion.div>
    </>
  );
}

/**
 * @param {{cart: PageLayoutProps['cart']}}
 */
function CartAside({cart}) {
  return (
    <Aside type="cart" heading="CART">
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  const queriesDatalistId = useId();
  return (
    <Aside type="search" heading="SEARCH">
      <div className="predictive-search">
        <br />
        <SearchFormPredictive>
          {({fetchResults, goToSearch, inputRef}) => (
            <>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search"
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
              />
              &nbsp;
              <button onClick={goToSearch}>Search</button>
            </>
          )}
        </SearchFormPredictive>

        <SearchResultsPredictive>
          {({items, total, term, state, closeSearch}) => {
            const {articles, collections, pages, products, queries} = items;

            if (state === 'loading' && term.current) {
              return <div>Loading...</div>;
            }

            if (!total) {
              return <SearchResultsPredictive.Empty term={term} />;
            }

            return (
              <>
                <SearchResultsPredictive.Queries
                  queries={queries}
                  queriesDatalistId={queriesDatalistId}
                />
                <SearchResultsPredictive.Products
                  products={products}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Collections
                  collections={collections}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Pages
                  pages={pages}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Articles
                  articles={articles}
                  closeSearch={closeSearch}
                  term={term}
                />
                {term.current && total ? (
                  <Link
                    onClick={closeSearch}
                    to={`${SEARCH_ENDPOINT}?q=${term.current}`}
                  >
                    <p>
                      View all results for <q>{term.current}</q>
                      &nbsp; →
                    </p>
                  </Link>
                ) : null}
              </>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </Aside>
  );
}

/**
 * @param {{
 *   header: PageLayoutProps['header'];
 *   publicStoreDomain: PageLayoutProps['publicStoreDomain'];
 * }}
 */
function MobileMenuAside({header, publicStoreDomain}) {
  return (
    header.menu &&
    header.shop.primaryDomain?.url && (
      <Aside type="mobile" heading="MENU">
        <HeaderMenu
          menu={header.menu}
          viewport="mobile"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
      </Aside>
    )
  );
}

/**
 * @typedef {Object} PageLayoutProps
 * @property {Promise<CartApiQueryFragment|null>} cart
 * @property {Promise<FooterQuery|null>} footer
 * @property {HeaderQuery} header
 * @property {Promise<boolean>} isLoggedIn
 * @property {string} publicStoreDomain
 * @property {React.ReactNode} [children]
 */

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('storefrontapi.generated').FooterQuery} FooterQuery */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
