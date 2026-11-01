import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  useRouteLoaderData,
} from 'react-router';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({matches}) => {
  const portal = matches.find((m) => m.id === 'root')?.data?.portal;
  return [{title: portal ? `My Locations | ${portal.name}` : 'Addresses'}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  context.customerAccount.handleAuthStatus();

  return {};
}

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const {customerAccount} = context;

  try {
    const form = await request.formData();

    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : null;
    if (!addressId) {
      throw new Error('You must provide an address id.');
    }

    // this will ensure redirecting to login never happen for mutatation
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return data(
        {error: {[addressId]: 'Unauthorized'}},
        {
          status: 401,
        },
      );
    }

    const defaultAddress = form.has('defaultAddress')
      ? String(form.get('defaultAddress')) === 'on'
      : false;
    const address = {};
    const keys = [
      'address1',
      'address2',
      'city',
      'company',
      'territoryCode',
      'firstName',
      'lastName',
      'phoneNumber',
      'zoneCode',
      'zip',
    ];

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        address[key] = value;
      }
    }

    // Portal locations are identified by store name (plan §4.7, 12m)
    const savesAddress = request.method === 'POST' || request.method === 'PUT';
    if (context.portal && savesAddress && !address.company?.trim()) {
      return data(
        {error: {[addressId]: 'Please enter a store name or number.'}},
        {status: 400},
      );
    }

    switch (request.method) {
      case 'POST': {
        // handle new address creation
        try {
          const {data, errors} = await customerAccount.mutate(
            CREATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressCreate?.userErrors?.length) {
            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
          }

          if (!data?.customerAddressCreate?.customerAddress) {
            throw new Error('Customer address create failed.');
          }

          return {
            error: null,
            createdAddress: data?.customerAddressCreate?.customerAddress,
            defaultAddress,
          };
        } catch (error) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'PUT': {
        // handle address updates
        try {
          const {data, errors} = await customerAccount.mutate(
            UPDATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                addressId: decodeURIComponent(addressId),
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressUpdate?.userErrors?.length) {
            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
          }

          if (!data?.customerAddressUpdate?.customerAddress) {
            throw new Error('Customer address update failed.');
          }

          return {
            error: null,
            updatedAddress: address,
            defaultAddress,
          };
        } catch (error) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'DELETE': {
        // handles address deletion
        try {
          const {data, errors} = await customerAccount.mutate(
            DELETE_ADDRESS_MUTATION,
            {
              variables: {
                addressId: decodeURIComponent(addressId),
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressDelete?.userErrors?.length) {
            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
          }

          if (!data?.customerAddressDelete?.deletedAddressId) {
            throw new Error('Customer address delete failed.');
          }

          return {error: null, deletedAddress: addressId};
        } catch (error) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      default: {
        return data(
          {error: {[addressId]: 'Method not allowed'}},
          {
            status: 405,
          },
        );
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      return data(
        {error: error.message},
        {
          status: 400,
        },
      );
    }
    return data(
      {error},
      {
        status: 400,
      },
    );
  }
}

export default function Addresses() {
  const {customer} = useOutletContext();
  const {defaultAddress, addresses} = customer;
  const isPortal = !!useRouteLoaderData('root')?.portal;

  // The create form always shows: with no saved addresses it used to be
  // hidden, leaving no way to add one
  return (
    <div className="account-addresses">
      <h2>{isPortal ? 'My Locations' : 'Addresses'}</h2>
      <br />
      <div>
        <div>
          <legend>{isPortal ? 'Add a location' : 'Create address'}</legend>
          <NewAddressForm />
        </div>
        <br />
        <hr />
        <br />
        {addresses.nodes.length ? (
          <ExistingAddresses
            addresses={addresses}
            defaultAddress={defaultAddress}
            isPortal={isPortal}
          />
        ) : (
          <p>
            {isPortal
              ? 'You have no locations saved.'
              : 'You have no addresses saved.'}
          </p>
        )}
      </div>
    </div>
  );
}

function NewAddressForm() {
  const newAddress = {
    address1: '',
    address2: '',
    city: '',
    company: '',
    territoryCode: '',
    firstName: '',
    id: 'new',
    lastName: '',
    phoneNumber: '',
    zoneCode: '',
    zip: '',
  };

  return (
    <AddressForm
      addressId={'NEW_ADDRESS_ID'}
      address={newAddress}
      defaultAddress={null}
    >
      {({stateForMethod}) => (
        <div>
          <button
            disabled={stateForMethod('POST') !== 'idle'}
            formMethod="POST"
            type="submit"
          >
            {stateForMethod('POST') !== 'idle' ? 'Creating' : 'Create'}
          </button>
        </div>
      )}
    </AddressForm>
  );
}

/**
 * @param {Pick<CustomerFragment, 'addresses' | 'defaultAddress'>}
 */
function ExistingAddresses({addresses, defaultAddress, isPortal}) {
  return (
    <div>
      <legend>{isPortal ? 'Your locations' : 'Existing addresses'}</legend>
      {addresses.nodes.map((address) => (
        <div key={address.id}>
          {isPortal && (
            <h3 className="portal-location-name">
              {address.company || address.address1}
              {defaultAddress?.id === address.id ? ' (default)' : ''}
            </h3>
          )}
          <AddressForm
            key={address.id}
            addressId={address.id}
            address={address}
            defaultAddress={defaultAddress}
          >
            {({stateForMethod}) => (
              <div>
                <button
                  disabled={stateForMethod('PUT') !== 'idle'}
                  formMethod="PUT"
                  type="submit"
                >
                  {stateForMethod('PUT') !== 'idle' ? 'Saving' : 'Save'}
                </button>
                <button
                  disabled={stateForMethod('DELETE') !== 'idle'}
                  formMethod="DELETE"
                  type="submit"
                >
                  {stateForMethod('DELETE') !== 'idle' ? 'Deleting' : 'Delete'}
                </button>
              </div>
            )}
          </AddressForm>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{
 *   addressId: AddressFragment['id'];
 *   address: CustomerAddressInput;
 *   defaultAddress: CustomerFragment['defaultAddress'];
 *   children: (props: {
 *     stateForMethod: (method: 'PUT' | 'POST' | 'DELETE') => Fetcher['state'];
 *   }) => React.ReactNode;
 * }}
 */
export function AddressForm({addressId, address, defaultAddress, children}) {
  const {state, formMethod} = useNavigation();
  /** @type {ActionReturnData} */
  const action = useActionData();
  const error = action?.error?.[addressId];
  const isDefaultAddress = defaultAddress?.id === addressId;
  // Unique per form: the page shows one form per saved address
  const fieldId = (name) => `${name}-${addressId}`;
  // Franchise portals call addresses "locations" (plan §4.7, 12m)
  const isPortal = !!useRouteLoaderData('root')?.portal;
  return (
    <Form id={addressId}>
      <fieldset>
        <input type="hidden" name="addressId" defaultValue={addressId} />
        <label htmlFor={fieldId('firstName')}>First name*</label>
        <input
          aria-label="First name"
          autoComplete="given-name"
          defaultValue={address?.firstName ?? ''}
          id={fieldId('firstName')}
          name="firstName"
          placeholder="First name"
          required
          type="text"
        />
        <label htmlFor={fieldId('lastName')}>Last name*</label>
        <input
          aria-label="Last name"
          autoComplete="family-name"
          defaultValue={address?.lastName ?? ''}
          id={fieldId('lastName')}
          name="lastName"
          placeholder="Last name"
          required
          type="text"
        />
        <label htmlFor={fieldId('company')}>
          {isPortal ? 'Store name or number*' : 'Company'}
        </label>
        <input
          aria-label={isPortal ? 'Store name or number' : 'Company'}
          required={isPortal}
          autoComplete="organization"
          defaultValue={address?.company ?? ''}
          id={fieldId('company')}
          name="company"
          placeholder={isPortal ? 'Store name or number*' : 'Company'}
          type="text"
        />
        <label htmlFor={fieldId('address1')}>Address line*</label>
        <input
          aria-label="Address line 1"
          autoComplete="address-line1"
          defaultValue={address?.address1 ?? ''}
          id={fieldId('address1')}
          name="address1"
          placeholder="Address line 1*"
          required
          type="text"
        />
        <label htmlFor={fieldId('address2')}>Address line 2</label>
        <input
          aria-label="Address line 2"
          autoComplete="address-line2"
          defaultValue={address?.address2 ?? ''}
          id={fieldId('address2')}
          name="address2"
          placeholder="Address line 2"
          type="text"
        />
        <label htmlFor={fieldId('city')}>City*</label>
        <input
          aria-label="City"
          autoComplete="address-level2"
          defaultValue={address?.city ?? ''}
          id={fieldId('city')}
          name="city"
          placeholder="City"
          required
          type="text"
        />
        <label htmlFor={fieldId('zoneCode')}>State / Province*</label>
        <input
          aria-label="State/Province"
          autoComplete="address-level1"
          defaultValue={address?.zoneCode ?? ''}
          id={fieldId('zoneCode')}
          name="zoneCode"
          placeholder="State / Province"
          required
          type="text"
        />
        <label htmlFor={fieldId('zip')}>Zip / Postal Code*</label>
        <input
          aria-label="Zip"
          autoComplete="postal-code"
          defaultValue={address?.zip ?? ''}
          id={fieldId('zip')}
          name="zip"
          placeholder="Zip / Postal Code"
          required
          type="text"
        />
        <label htmlFor={fieldId('territoryCode')}>Country Code*</label>
        <input
          aria-label="Country Code"
          autoComplete="country"
          defaultValue={address?.territoryCode ?? ''}
          id={fieldId('territoryCode')}
          name="territoryCode"
          placeholder="Country"
          required
          type="text"
          maxLength={2}
        />
        <label htmlFor={fieldId('phoneNumber')}>Phone</label>
        <input
          aria-label="Phone Number"
          autoComplete="tel"
          defaultValue={address?.phoneNumber ?? ''}
          id={fieldId('phoneNumber')}
          name="phoneNumber"
          placeholder="+16135551111"
          pattern="^\+?[1-9]\d{3,14}$"
          type="tel"
        />
        <div>
          <input
            defaultChecked={isDefaultAddress}
            id={fieldId('defaultAddress')}
            name="defaultAddress"
            type="checkbox"
          />
          <label htmlFor={fieldId('defaultAddress')}>
            {isPortal
              ? 'Default location (pre-selected at checkout)'
              : 'Set as default address'}
          </label>
        </div>
        {error ? (
          <p role="alert">
            <mark>
              <small>{error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        {children({
          stateForMethod: (method) => (formMethod === method ? state : 'idle'),
        })}
      </fieldset>
    </Form>
  );
}

/**
 * @typedef {{
 *   addressId?: string | null;
 *   createdAddress?: AddressFragment;
 *   defaultAddress?: string | null;
 *   deletedAddress?: string | null;
 *   error: Record<AddressFragment['id'], string> | null;
 *   updatedAddress?: AddressFragment;
 * }} ActionResponse
 */

/** @typedef {import('@shopify/hydrogen/customer-account-api-types').CustomerAddressInput} CustomerAddressInput */
/** @typedef {import('customer-accountapi.generated').AddressFragment} AddressFragment */
/** @typedef {import('customer-accountapi.generated').CustomerFragment} CustomerFragment */
/** @template T @typedef {import('react-router').Fetcher<T>} Fetcher */
/** @typedef {import('./+types/account.addresses').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
