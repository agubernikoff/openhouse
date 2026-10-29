import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
} from 'react-router';
import {Money, Image} from '@shopify/hydrogen';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
import {reorderPortalOrder} from '~/lib/portalCart.server';
import {
  isPortalOrder,
  portalOrderStatus,
  portalOrderTracking,
} from '~/lib/portalOrders';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `Order ${data?.order?.name}`}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({params, context}) {
  const {customerAccount} = context;
  if (!params.id) {
    return redirect('/account/orders');
  }

  const orderId = atob(params.id);
  const {data, errors} = await customerAccount.query(CUSTOMER_ORDER_QUERY, {
    variables: {
      orderId,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.order) {
    throw new Error('Order not found');
  }

  const {order} = data;

  // A portal only shows its own orders (plan §4.7)
  if (context.portal && !isPortalOrder(order, context.portal)) {
    throw new Response('Order not found', {status: 404});
  }

  // Extract line items directly from nodes array
  const lineItems = order.lineItems.nodes;

  // Extract discount applications directly from nodes array
  const discountApplications = order.discountApplications.nodes;

  // Get fulfillment status from first fulfillment node
  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? 'N/A';

  // Get first discount value with proper type checking
  const firstDiscount = discountApplications[0]?.value;

  // Type guard for MoneyV2 discount
  const discountValue =
    firstDiscount?.__typename === 'MoneyV2' ? firstDiscount : null;

  // Type guard for percentage discount
  const discountPercentage =
    firstDiscount?.__typename === 'PricingPercentageValue'
      ? firstDiscount.percentage
      : null;

  return {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
  };
}

/**
 * Franchise portal re-order: rebuilds the cart from this order's lines.
 * @param {Route.ActionArgs}
 */
export async function action({request, params, context}) {
  const {customerAccount, portal, cart} = context;
  if (!portal || !params.id) {
    throw new Response('Not found', {status: 404});
  }

  const formData = await request.formData();
  if (formData.get('intent') !== 'reorder') {
    throw new Response('Bad request', {status: 400});
  }

  // Loaded through the customer's own session, so it's always their order
  const {data} = await customerAccount.query(CUSTOMER_ORDER_QUERY, {
    variables: {
      orderId: atob(params.id),
      language: customerAccount.i18n.language,
    },
  });
  const order = data?.order;
  if (!order || !isPortalOrder(order, portal)) {
    throw new Response('Order not found', {status: 404});
  }

  const reorder = await reorderPortalOrder(context, order);
  if (!reorder.ok) return {error: reorder.message};

  const headers = cart.setCartId(reorder.result.cart.id);
  const search = new URLSearchParams({reordered: String(reorder.added)});
  if (reorder.skipped) search.set('skipped', String(reorder.skipped));
  return redirect(`/cart?${search}`, {headers});
}

export default function OrderRoute() {
  /** @type {LoaderReturnData} */
  const {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
  } = useLoaderData();
  const isPortal = !!useRouteLoaderData('root')?.portal;
  return (
    <div className="account-order">
      <h2>Order {order.name}</h2>
      <p>Placed on {new Date(order.processedAt).toDateString()}</p>
      {order.confirmationNumber && (
        <p>Confirmation: {order.confirmationNumber}</p>
      )}
      {isPortal && <PortalOrderActions />}
      <br />
      <div>
        <table>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Price</th>
              <th scope="col">Quantity</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((lineItem, lineItemIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <OrderLineRow key={lineItemIndex} lineItem={lineItem} />
            ))}
          </tbody>
          <tfoot>
            {((discountValue && discountValue.amount) ||
              discountPercentage) && (
              <tr>
                <th scope="row" colSpan={3}>
                  <p>Discounts</p>
                </th>
                <th scope="row">
                  <p>Discounts</p>
                </th>
                <td>
                  {discountPercentage ? (
                    <span>-{discountPercentage}% OFF</span>
                  ) : (
                    discountValue && <Money data={discountValue} />
                  )}
                </td>
              </tr>
            )}
            <tr>
              <th scope="row" colSpan={3}>
                <p>Subtotal</p>
              </th>
              <th scope="row">
                <p>Subtotal</p>
              </th>
              <td>
                <Money data={order.subtotal} />
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                Tax
              </th>
              <th scope="row">
                <p>Tax</p>
              </th>
              <td>
                <Money data={order.totalTax} />
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                Total
              </th>
              <th scope="row">
                <p>Total</p>
              </th>
              <td>
                <Money data={order.totalPrice} />
              </td>
            </tr>
          </tfoot>
        </table>
        <div>
          <h3>Shipping Address</h3>
          {order?.shippingAddress ? (
            <address>
              <p>{order.shippingAddress.name}</p>
              {order.shippingAddress.formatted ? (
                <p>{order.shippingAddress.formatted}</p>
              ) : (
                ''
              )}
              {order.shippingAddress.formattedArea ? (
                <p>{order.shippingAddress.formattedArea}</p>
              ) : (
                ''
              )}
            </address>
          ) : (
            <p>No shipping address defined</p>
          )}
          <h3>Status</h3>
          <div>
            <p>{isPortal ? portalOrderStatus(order) : fulfillmentStatus}</p>
            {isPortal &&
              portalOrderTracking(order).map((t) =>
                t.url ? (
                  <p key={t.number ?? t.url}>
                    <a href={t.url} target="_blank" rel="noreferrer">
                      Track {t.company ? `${t.company} ` : ''}
                      {t.number ?? 'shipment'} →
                    </a>
                  </p>
                ) : (
                  t.number && (
                    <p key={t.number}>
                      {t.company ? `${t.company}: ` : 'Tracking: '}
                      {t.number}
                    </p>
                  )
                ),
              )}
          </div>
        </div>
      </div>
      <br />
      <p>
        <a target="_blank" href={order.statusPageUrl} rel="noreferrer">
          View Order Status →
        </a>
      </p>
    </div>
  );
}

/**
 * Franchise portal: re-order this order's items into the cart (posts to
 * this route's action).
 */
function PortalOrderActions() {
  const actionData = useActionData();
  const {state} = useNavigation();
  const busy = state !== 'idle';
  return (
    <Form method="POST" className="portal-order-actions">
      <input type="hidden" name="intent" value="reorder" />
      <button type="submit" disabled={busy}>
        {busy ? 'Re-ordering…' : 'Re-order these items'}
      </button>
      {actionData?.error && (
        <p className="portal-form-error" role="alert">
          {actionData.error}
        </p>
      )}
    </Form>
  );
}

/**
 * @param {{lineItem: OrderLineItemFullFragment}}
 */
function OrderLineRow({lineItem}) {
  return (
    <tr key={lineItem.id}>
      <td>
        <div>
          {lineItem?.image && (
            <div>
              <Image
                data={lineItem.image}
                alt={lineItem.image?.altText || lineItem.title}
                width={96}
                height={96}
              />
            </div>
          )}
          <div>
            <p>{lineItem.title}</p>
            <small>{lineItem.variantTitle}</small>
          </div>
        </div>
      </td>
      <td>
        <Money data={lineItem.price} />
      </td>
      <td>{lineItem.quantity}</td>
      <td>
        <Money data={lineItem.totalDiscount} />
      </td>
    </tr>
  );
}

/** @typedef {import('./+types/account.orders.$id').Route} Route */
/** @typedef {import('customer-accountapi.generated').OrderLineItemFullFragment} OrderLineItemFullFragment */
/** @typedef {import('customer-accountapi.generated').OrderQuery} OrderQuery */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
