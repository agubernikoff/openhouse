import {CartForm, Money} from '@shopify/hydrogen';
import {useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';

/**
 * @param {CartSummaryProps}
 */
export function CartSummary({cart, layout}) {
  const className =
    layout === 'page' ? 'cart-summary-page' : 'cart-summary-aside';

  return (
    <div aria-labelledby="cart-summary" className={className}>
      <dl className="cart-subtotal">
        <dt>Subtotal:</dt>
        <dd style={{display: 'flex', gap: '3.5px'}}>
          {cart?.cost?.subtotalAmount?.amount ? (
            <>
              <Money data={cart?.cost?.subtotalAmount} /> USD
            </>
          ) : (
            '-'
          )}
        </dd>
      </dl>
      {/* <CartDiscounts discountCodes={cart?.discountCodes} />
      <CartGiftCard giftCardCodes={cart?.appliedGiftCards} /> */}
      <CartCheckoutActions
        checkoutUrl={cart?.checkoutUrl}
        layout={layout}
        cart={cart}
      />
    </div>
  );
}

/**
 * @param {{checkoutUrl?: string, layout: string, cart: any}}
 */
function CartCheckoutActions({checkoutUrl, layout, cart}) {
  const [isOpen, setIsOpen] = useState(false);
  const [instructions, setInstructions] = useState(cart?.note || '');
  const textareaRef = useRef(null);
  const fetcher = useFetcher();
  const hasSubmittedRef = useRef(false);

  if (!checkoutUrl) return null;

  const isCartPage = layout === 'page';

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Handle successful submission
  useEffect(() => {
    if (fetcher.state === 'loading' && hasSubmittedRef.current) {
      // Submission in progress
      return;
    }

    if (fetcher.state === 'idle' && hasSubmittedRef.current && fetcher.data) {
      // Close textarea after successful submission
      setIsOpen(false);
      hasSubmittedRef.current = false;
    }
  }, [fetcher.state, fetcher.data]);

  const handleButtonClick = () => {
    if (isOpen && instructions.trim()) {
      // Submit the note
      const formData = new FormData();
      formData.append('note', instructions);

      hasSubmittedRef.current = true;
      fetcher.submit(formData, {
        method: 'POST',
        action: '/cart',
      });
      return; // Exit early after submit
    }

    if (isOpen && !instructions.trim()) {
      // Close if no text
      setIsOpen(false);
    } else if (!isOpen) {
      // Open the textarea
      setIsOpen(true);
    }
  };

  const getButtonText = () => {
    // When closed with a saved note
    if (!isOpen && instructions.trim()) return 'EDIT SPECIAL INSTRUCTIONS';
    // When closed without a note
    if (!isOpen) return 'ORDER SPECIAL INSTRUCTIONS';
    // When open and has text (editing existing or new)
    if (isOpen && instructions.trim()) return 'SUBMIT';
    // When open but empty
    return 'CLOSE';
  };

  return (
    <div className="cart-checkout-actions">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
          width: isCartPage ? '50%' : '100%',
        }}
      >
        {isCartPage ? (
          <>
            <button
              className="cart-special-instructions"
              onClick={handleButtonClick}
              type="button"
            >
              {getButtonText()}
            </button>
            {!isOpen && instructions.trim() && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  fontSize: '14px',
                  color: '#666',
                  fontStyle: 'italic',
                  borderLeft: '2px solid #ddd',
                  paddingLeft: '12px',
                }}
              >
                Note: {instructions}
              </div>
            )}
          </>
        ) : (
          <a href="/cart" className="cart-special-instructions">
            VIEW CART
          </a>
        )}

        {isCartPage && (
          <div
            style={{
              maxHeight: isOpen ? '200px' : '0',
              overflow: 'hidden',
              transition: 'max-height 0.2s ease-out, margin-top 0.2s ease-out',
              marginTop: isOpen ? '8px' : '0',
            }}
          >
            <textarea
              ref={textareaRef}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add any special instructions for your order."
              rows={4}
              style={{
                width: '94.5%',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '80px',
                background: 'transparent',
                maxHeight: '80px',
                outline: 'none',
                boxShadow: 'none',
              }}
            />
          </div>
        )}
      </div>

      <a href={checkoutUrl} target="_self" className="cart-checkout-button">
        PROCEED TO CHECKOUT
      </a>
    </div>
  );
}

/**
 * @param {{
 *   discountCodes?: CartApiQueryFragment['discountCodes'];
 * }}
 */
function CartDiscounts({discountCodes}) {
  const codes =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <div>
      {/* Have existing discount, display it with a remove option */}
      <dl hidden={!codes.length}>
        <div>
          <dt>Discount(s)</dt>
          <UpdateDiscountForm>
            <div className="cart-discount">
              <code>{codes?.join(', ')}</code>
              &nbsp;
              <button>Remove</button>
            </div>
          </UpdateDiscountForm>
        </div>
      </dl>

      {/* Show an input to apply a discount */}
      <UpdateDiscountForm discountCodes={codes}>
        <div>
          <input type="text" name="discountCode" placeholder="Discount code" />
          &nbsp;
          <button type="submit">Apply</button>
        </div>
      </UpdateDiscountForm>
    </div>
  );
}

/**
 * @param {{
 *   discountCodes?: string[];
 *   children: React.ReactNode;
 * }}
 */
function UpdateDiscountForm({discountCodes, children}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}

/**
 * @param {{
 *   giftCardCodes: CartApiQueryFragment['appliedGiftCards'] | undefined;
 * }}
 */
function CartGiftCard({giftCardCodes}) {
  const appliedGiftCardCodes = useRef([]);
  const giftCardCodeInput = useRef(null);
  const giftCardAddFetcher = useFetcher({key: 'gift-card-add'});

  // Clear the gift card code input after the gift card is added
  useEffect(() => {
    if (giftCardAddFetcher.data) {
      giftCardCodeInput.current.value = '';
    }
  }, [giftCardAddFetcher.data]);

  function saveAppliedCode(code) {
    const formattedCode = code.replace(/\s/g, ''); // Remove spaces
    if (!appliedGiftCardCodes.current.includes(formattedCode)) {
      appliedGiftCardCodes.current.push(formattedCode);
    }
  }

  return (
    <div>
      {/* Display applied gift cards with individual remove buttons */}
      {giftCardCodes && giftCardCodes.length > 0 && (
        <dl>
          <dt>Applied Gift Card(s)</dt>
          {giftCardCodes.map((giftCard) => (
            <RemoveGiftCardForm key={giftCard.id} giftCardId={giftCard.id}>
              <div className="cart-discount">
                <code>***{giftCard.lastCharacters}</code>
                &nbsp;
                <Money data={giftCard.amountUsed} />
                &nbsp;
                <button type="submit">Remove</button>
              </div>
            </RemoveGiftCardForm>
          ))}
        </dl>
      )}

      {/* Show an input to apply a gift card */}
      <UpdateGiftCardForm
        giftCardCodes={appliedGiftCardCodes.current}
        saveAppliedCode={saveAppliedCode}
        fetcherKey="gift-card-add"
      >
        <div>
          <input
            type="text"
            name="giftCardCode"
            placeholder="Gift card code"
            ref={giftCardCodeInput}
          />
          &nbsp;
          <button type="submit" disabled={giftCardAddFetcher.state !== 'idle'}>
            Apply
          </button>
        </div>
      </UpdateGiftCardForm>
    </div>
  );
}

/**
 * @param {{
 *   giftCardCodes?: string[];
 *   saveAppliedCode?: (code: string) => void;
 *   fetcherKey?: string;
 *   children: React.ReactNode;
 * }}
 */
function UpdateGiftCardForm({
  giftCardCodes,
  saveAppliedCode,
  fetcherKey,
  children,
}) {
  return (
    <CartForm
      fetcherKey={fetcherKey}
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesUpdate}
      inputs={{
        giftCardCodes: giftCardCodes || [],
      }}
    >
      {(fetcher) => {
        const code = fetcher.formData?.get('giftCardCode');
        if (code && saveAppliedCode) {
          saveAppliedCode(code);
        }
        return children;
      }}
    </CartForm>
  );
}

/**
 * @param {{
 *   giftCardId: string;
 *   children: React.ReactNode;
 * }}
 */
function RemoveGiftCardForm({giftCardId, children}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{
        giftCardCodes: [giftCardId],
      }}
    >
      {children}
    </CartForm>
  );
}

/**
 * @typedef {{
 *   cart: OptimisticCart<CartApiQueryFragment | null>;
 *   layout: CartLayout;
 * }} CartSummaryProps
 */

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('~/components/CartMain').CartLayout} CartLayout */
/** @typedef {import('@shopify/hydrogen').OptimisticCart} OptimisticCart */
/** @typedef {import('react-router').FetcherWithComponents} FetcherWithComponents */
