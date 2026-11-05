import {Link, useLoaderData} from 'react-router';
import {Money} from '@shopify/hydrogen';
import {getAnyPortalOrder} from '~/lib/portalAdmin.server';
import {adminOrderStatus} from '~/lib/portalOrders';
import {requirePortalRole} from '~/portal/access.server';

/**
 * One of the portal's orders, any franchisee (roadmap 12n).
 * @param {Route.LoaderArgs}
 */
export async function loader({params, context}) {
  if (!context.portal) throw new Response('Not found', {status: 404});
  await requirePortalRole(context, ['admin']);
  if (!/^\d+$/.test(params.id ?? '')) {
    throw new Response('Not found', {status: 404});
  }

  const order = await getAnyPortalOrder(
    context,
    `gid://shopify/Order/${params.id}`,
  );
  if (!order) throw new Response('Not found', {status: 404});
  return {order};
}

export default function AdminOrder() {
  const {order} = useLoaderData();
  const ship = order.shippingAddress;
  const tracking = order.fulfillments.flatMap((f) => f.trackingInfo ?? []);

  return (
    <section className="portal-admin-order">
      <p>
        <Link to="/admin">← All orders</Link>
      </p>
      <h2>Order {order.name}</h2>
      <p>
        Placed {new Date(order.processedAt).toLocaleDateString()} by{' '}
        {order.customer?.displayName ?? '—'}
        {order.customer?.defaultEmailAddress?.emailAddress &&
          ` (${order.customer.defaultEmailAddress.emailAddress})`}
      </p>
      <p>
        <strong>Status:</strong> {adminOrderStatus(order)}
      </p>
      {tracking.map((t) =>
        t.url ? (
          <p key={t.number ?? t.url}>
            <a href={t.url} target="_blank" rel="noreferrer">
              Track {t.company ? `${t.company} ` : ''}
              {t.number ?? 'shipment'} →
            </a>
          </p>
        ) : null,
      )}

      <table className="portal-admin-table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Color / size</th>
            <th scope="col">Qty</th>
            <th scope="col">Unit price</th>
          </tr>
        </thead>
        <tbody>
          {order.lineItems.nodes
            .filter((l) => l.currentQuantity > 0)
            .map((line) => (
              <tr key={line.id}>
                <td>{line.title}</td>
                <td>{line.variantTitle ?? '—'}</td>
                <td>{line.currentQuantity}</td>
                <td>
                  <Money data={line.originalUnitPriceSet.shopMoney} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <p>
        <strong>Total:</strong> <Money data={order.totalPriceSet.shopMoney} />
      </p>

      {ship && (
        <>
          <h3>Ship to</h3>
          <address>
            {[ship.name, ship.company, ship.address1, ship.address2]
              .filter(Boolean)
              .map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            {[ship.city, ship.provinceCode, ship.zip].filter(Boolean).join(' ')}
          </address>
        </>
      )}
    </section>
  );
}

/** @typedef {import('./+types/admin.orders.$id').Route} Route */
