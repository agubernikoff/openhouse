import {NavLink, Outlet} from 'react-router';
import {requirePortalRole} from '~/portal/access.server';

/**
 * Franchise portal corporate admin (roadmap 12n/12o): the client's corporate
 * account (`portal:{handle}:admin`) sees all of the portal's orders and
 * manages member access. Portal hosts only.
 * @type {Route.MetaFunction}
 */
export const meta = ({matches}) => {
  const portal = matches.find((m) => m.id === 'root')?.data?.portal;
  return [{title: `Admin | ${portal?.name ?? 'Portal'}`}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  if (!context.portal) throw new Response('Not found', {status: 404});
  await requirePortalRole(context, ['admin']);
  return {};
}

export default function AdminLayout() {
  const style = ({isActive}) => ({fontWeight: isActive ? 'bold' : undefined});
  return (
    <div className="portal-admin">
      <h1>Admin</h1>
      <nav className="portal-admin-nav" aria-label="Admin">
        <NavLink to="/admin" end style={style}>
          Orders
        </NavLink>
        <NavLink to="/admin/members" style={style}>
          Members
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

/** @typedef {import('./+types/admin').Route} Route */
