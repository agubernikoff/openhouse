import {redirect} from 'react-router';
import normalizeMetaobject from '~/helpers/normalizeMetaobject';

const MAINTENANCE_QUERY = `#graphql
  query MaintenanceMode {
    shop {
      maintenance: metafield(namespace: "custom", key: "maintenance") {
        reference {
          ... on Metaobject {
            fields {
              key
              value
            }
          }
        }
      }
    }
  }
`;

export async function checkMaintenanceRedirect({context}) {
  try {
    const data = await context.storefront.query(MAINTENANCE_QUERY, {
      cache: context.storefront.CacheShort(),
    });
    const maintenance = normalizeMetaobject(data?.shop?.maintenance?.reference);
    if (maintenance?.is_under_maintenance?.value === 'true') {
      const bypass = context.session.get('maintenanceBypass');
      if (bypass !== maintenance?.password?.value) {
        throw redirect('/');
      }
    }
  } catch (e) {
    if (e instanceof Response) throw e;
  }
}
