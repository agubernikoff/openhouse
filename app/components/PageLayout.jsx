import {Await, useFetcher, useLocation} from 'react-router';
import {Suspense, useEffect, useRef, useState} from 'react';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header} from '~/components/Header';
import {usePopUp} from '~/context/PopUpContext';
import {motion, AnimatePresence} from 'motion/react';
import normalizeMetaobject from '~/helpers/normalizeMetaobject';
import {Image} from '@shopify/hydrogen';
import {getVisibleFocusable} from '~/lib/focus';

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
  const {pathname} = useLocation();
  const mainRef = useRef(null);
  const isInitialMount = useRef(true);

  // Client-side route changes don't reset focus like a full page load
  // would. Since the header/footer are part of the persistent layout (not
  // remounted on navigation), a keyboard user who navigates via a footer or
  // header link stays focused right there — Tab then just continues through
  // the footer/header instead of the new page. Move focus to the main
  // content region after every navigation (but not on initial load, where
  // the browser's own default focus behavior is correct).
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <Aside.Provider>
      <AnimatePresence>
        {shouldShowPopup() && <WelcomePopup data={pop_up} />}
      </AnimatePresence>
      {header && (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
          about_image={about_image}
        />
      )}
      <main id="main-content" tabIndex={-1} ref={mainRef}>
        {children}
      </main>
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
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  const handleClose = (timeout = 300) => {
    setTimeout(() => {
      markPopupAsShown();
    }, timeout);
  };

  // This modal appears unprompted, so it needs the full treatment: trap
  // focus inside it, hide the rest of the page from assistive tech, close
  // on Escape, and restore focus to wherever it was before the popup
  // appeared. Mirrors the mobile menu's modal trap in Header.jsx.
  useEffect(() => {
    previousFocusRef.current = document.activeElement;

    const headerEl = document.querySelector('header.header');
    const mainEl = document.querySelector('main');
    const footerEl = document.querySelector('footer.footer');
    headerEl?.setAttribute('aria-hidden', 'true');
    mainEl?.setAttribute('aria-hidden', 'true');
    footerEl?.setAttribute('aria-hidden', 'true');

    // Content (image/heading/CTA) loads async via Suspense/Await and the
    // panel itself fades in over ~1s — give both a moment before trying to
    // move focus to the first real focusable element inside it.
    const focusTimer = setTimeout(() => {
      const focusable = getVisibleFocusable(containerRef.current);
      (focusable[0] || containerRef.current)?.focus();
    }, 1000);

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getVisibleFocusable(containerRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      headerEl?.removeAttribute('aria-hidden');
      mainEl?.removeAttribute('aria-hidden');
      footerEl?.removeAttribute('aria-hidden');
      previousFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Promotional offer"
        tabIndex={-1}
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
                if (fields.enabled?.value === 'false') return null;
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
                        <Image
                          data={imageData}
                          alt={
                            imageData?.altText ||
                            fields.heading?.value ||
                            'Promotional offer'
                          }
                          sizes="500px"
                        />
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
                          <NewsletterForm handleClose={handleClose} />
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

export function NewsletterForm({handleClose}) {
  const fetcher = useFetcher();
  const [email, setEmail] = useState('');

  const isSubmitting = fetcher.state === 'submitting';
  const isSuccess = fetcher.data?.success;
  const successMessage = fetcher.data?.message;
  const error = fetcher.data?.error;
  const [displayErr, setDisplayErr] = useState('');
  const [displaySucc, setDisplaySucc] = useState('');

  useEffect(() => {
    if (error) {
      setDisplayErr(error);
      setDisplaySucc(''); // Clear success message
      const timer = setTimeout(() => setDisplayErr(''), 1600);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (isSuccess) {
      setEmail('');
      setDisplaySucc(successMessage);
      setDisplayErr(''); // Clear error message
      const timer = setTimeout(() => {
        setDisplaySucc('');
        handleClose(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, successMessage, handleClose]);

  const handleSubmit = (e) => {
    setDisplayErr('');
    setDisplaySucc('');
    e.preventDefault();
    const formData = new FormData();
    formData.append('email', email);
    fetcher.submit(formData, {
      method: 'post',
      action: '/api/newsletter',
    });
  };

  return (
    <div className="footer-newsletter">
      <form className="footer-newsletter-form" onSubmit={handleSubmit}>
        <input
          id="email"
          name="email"
          type="email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="footer-newsletter-input"
          autoComplete="off"
          required
          disabled={isSubmitting}
        />
        <button type="submit" aria-label="Subscribe" disabled={isSubmitting}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
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
      <AnimatePresence>
        {displayErr && (
          <motion.p
            key="error"
            role="alert"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            className="footer-newsletter-error"
          >
            {displayErr}
          </motion.p>
        )}
        {displaySucc && (
          <motion.p
            key="success"
            role="status"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            className="footer-newsletter-success"
          >
            {displaySucc}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
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
