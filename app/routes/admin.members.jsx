import {
  Form,
  Link,
  data,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import {changeMemberAccess, listPortalMembers} from '~/lib/portalAdmin.server';
import {requirePortalRole} from '~/portal/access.server';

/**
 * Portal members and their access (roadmap 12o). The corporate admin can
 * approve sign-ups, remove access and restore it. Admins are managed by
 * Openhouse in Shopify admin and can't be changed here.
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  if (!context.portal) throw new Response('Not found', {status: 404});
  const access = await requirePortalRole(context, ['admin']);

  const params = new URL(request.url).searchParams;
  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    after: params.get('after') ?? '',
  };
  const members = await listPortalMembers(context, filters);
  return {members, filters, selfId: access.customerId};
}

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  if (!context.portal) throw new Response('Not found', {status: 404});
  await requirePortalRole(context, ['admin']);

  const form = await request.formData();
  const customerId = String(form.get('customerId') ?? '');
  const intent = String(form.get('intent') ?? '');
  if (!customerId.startsWith('gid://shopify/Customer/')) {
    return data({error: 'Unknown member.'}, {status: 400});
  }

  const result = await changeMemberAccess(context, customerId, intent);
  if (!result.ok) return data({error: result.message}, {status: 400});
  return {done: {customerId, intent}};
}

const STATUS_LABELS = {
  pending: 'Awaiting approval',
  member: 'Active',
  admin: 'Admin',
  revoked: 'Access removed',
};

const ACTIONS = {
  pending: {intent: 'approve', label: 'Approve'},
  member: {intent: 'revoke', label: 'Remove access'},
  revoked: {intent: 'restore', label: 'Restore access'},
};

export default function AdminMembers() {
  const {members, filters, selfId} = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const busyId =
    navigation.state !== 'idle' && navigation.formData?.get('customerId');

  const nextParams = new URLSearchParams({
    ...(filters.q && {q: filters.q}),
    ...(filters.status && {status: filters.status}),
    after: members.pageInfo.endCursor ?? '',
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
            placeholder="Name or email"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={filters.status}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="portal-button">
          Filter
        </button>
      </Form>

      <div role="status" className="portal-admin-message">
        {actionData?.error && (
          <p className="portal-form-error">{actionData.error}</p>
        )}
        {actionData?.done && <p>Access updated.</p>}
      </div>

      {members.nodes.length ? (
        <table className="portal-admin-table">
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Locations</th>
              <th scope="col">Orders</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.nodes.map((member) => {
              const action = ACTIONS[member.role];
              const isSelf = member.id === selfId;
              return (
                <tr key={member.id}>
                  <td>
                    {member.displayName}
                    {member.defaultEmailAddress?.emailAddress && (
                      <small>
                        <br />
                        {member.defaultEmailAddress.emailAddress}
                      </small>
                    )}
                  </td>
                  <td>
                    {member.addressesV2.nodes.length
                      ? member.addressesV2.nodes.map((a, i) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <span key={i}>
                            {[a.company, a.city, a.provinceCode]
                              .filter(Boolean)
                              .join(', ')}
                            <br />
                          </span>
                        ))
                      : '—'}
                  </td>
                  <td>{member.numberOfOrders}</td>
                  <td>{STATUS_LABELS[member.role] ?? member.role}</td>
                  <td>
                    {action && !isSelf && (
                      <Form method="post">
                        <input
                          type="hidden"
                          name="customerId"
                          value={member.id}
                        />
                        <input
                          type="hidden"
                          name="intent"
                          value={action.intent}
                        />
                        <button
                          type="submit"
                          className="portal-button"
                          disabled={busyId === member.id}
                          aria-label={`${action.label}: ${member.displayName}`}
                        >
                          {busyId === member.id ? 'Saving…' : action.label}
                        </button>
                      </Form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>No members match.</p>
      )}

      <nav className="portal-admin-pages" aria-label="Pages">
        {filters.after && (
          <Link
            to={`?${new URLSearchParams({
              ...(filters.q && {q: filters.q}),
              ...(filters.status && {status: filters.status}),
            })}`}
          >
            ← First page
          </Link>
        )}
        {members.pageInfo.hasNextPage && (
          <Link to={`?${nextParams}`}>Next page →</Link>
        )}
      </nav>

      <p className="portal-admin-note">
        Removed members lose access within about 5 minutes. Admin accounts are
        managed by Openhouse.
      </p>
    </section>
  );
}

/** @typedef {import('./+types/admin.members').Route} Route */
