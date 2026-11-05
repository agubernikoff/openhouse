import {Form, Link, useLoaderData} from 'react-router';
import {Money} from '@shopify/hydrogen';
import {listAllPortalOrders} from '~/lib/portalAdmin.server';
import {adminOrderStatus, formatLocation} from '~/lib/portalOrders';
import {requirePortalRole} from '~/portal/access.server';

/**
 * All of the portal's orders across franchisees (roadmap 12n).
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  if (!context.portal) throw new Response('Not found', {status: 404});
  await requirePortalRole(context, ['admin']);

  const params = new URL(request.url).searchParams;
  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    after: params.get('after') ?? '',
  };
  const orders = await listAllPortalOrders(context, filters);
  return {orders, filters};
}

export default function AdminOrders() {
  const {orders, filters} = useLoaderData();
  const nextParams = new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(filters).filter(([k, v]) => v && k !== 'after'),
    ),
    after: orders.pageInfo.endCursor ?? '',
  });

  return (
    <section>
      <Form method="get" className="portal-admin-filters">
        <label>
          Search
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Order #, name or email"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={filters.status}>
            <option value="">All</option>
            <option value="unfulfilled">Not shipped</option>
            <option value="fulfilled">Shipped</option>
          </select>
        </label>
        <label>
          From
          <input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label>
          To
          <input type="date" name="to" defaultValue={filters.to} />
        </label>
        <button type="submit" className="portal-button">
          Filter
        </button>
      </Form>

      {orders.nodes.length ? (
        <table className="portal-admin-table">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Date</th>
              <th scope="col">Franchisee</th>
              <th scope="col">Location</th>
              <th scope="col">Status</th>
              <th scope="col">Items</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.nodes.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link to={`/admin/orders/${order.id.split('/').pop()}`}>
                    {order.name}
                  </Link>
                </td>
                <td>{new Date(order.processedAt).toLocaleDateString()}</td>
                <td>
                  {order.customer?.displayName ?? '—'}
                  {order.customer?.defaultEmailAddress?.emailAddress && (
                    <small>
                      <br />
                      {order.customer.defaultEmailAddress.emailAddress}
                    </small>
                  )}
                </td>
                <td>{formatLocation(order.shippingAddress)}</td>
                <td>{adminOrderStatus(order)}</td>
                <td>{order.currentSubtotalLineItemsQuantity}</td>
                <td>
                  <Money data={order.totalPriceSet.shopMoney} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No orders match.</p>
      )}

      <nav className="portal-admin-pages" aria-label="Pages">
        {filters.after && (
          <Link
            to={`?${new URLSearchParams(
              Object.entries(filters).filter(([k, v]) => v && k !== 'after'),
            )}`}
          >
            ← First page
          </Link>
        )}
        {orders.pageInfo.hasNextPage && (
          <Link to={`?${nextParams}`}>Next page →</Link>
        )}
      </nav>
    </section>
  );
}

/** @typedef {import('./+types/admin._index').Route} Route */
