import {useEffect, useRef} from 'react';
import {Form, useActionData, useLoaderData, useNavigation} from 'react-router';

const US_STATES = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['DC', 'District of Columbia'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
];

/**
 * Franchisee sign-up form (route: onboarding.jsx).
 */
export function PortalOnboarding() {
  const {portal, customer} = useLoaderData();
  const actionData = useActionData();
  const {state} = useNavigation();
  const submitting = state === 'submitting';
  const errorRef = useRef(null);
  const missing = new Set(actionData?.missing ?? []);

  // Move focus to the error summary so screen reader users hear it
  useEffect(() => {
    if (actionData?.error) errorRef.current?.focus();
  }, [actionData]);

  const field = (name, label, props = {}) => (
    <div className="portal-form-field">
      <label htmlFor={name}>
        {label}
        {props.required && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={missing.has(name) || undefined}
        {...props}
      />
    </div>
  );

  return (
    <section className="portal-onboarding">
      <h1>Set up your {portal.name} account</h1>
      <p>
        Tell us about your franchise. Openhouse will verify your account before
        you can place orders.
      </p>

      {actionData?.error && (
        <p
          className="portal-form-error"
          role="alert"
          tabIndex={-1}
          ref={errorRef}
        >
          {actionData.error}
        </p>
      )}

      <Form method="POST" className="portal-form" noValidate>
        <fieldset>
          <legend>Your details</legend>
          {field('firstName', 'First name', {
            required: true,
            autoComplete: 'given-name',
            defaultValue: customer?.firstName ?? '',
          })}
          {field('lastName', 'Last name', {
            required: true,
            autoComplete: 'family-name',
            defaultValue: customer?.lastName ?? '',
          })}
          {field('phone', 'Phone', {
            required: true,
            type: 'tel',
            autoComplete: 'tel',
          })}
          {customer?.emailAddress?.emailAddress && (
            <p className="portal-form-note">
              Signed in as {customer.emailAddress.emailAddress}
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend>Your location</legend>
          {field('storeName', 'Store name or number', {required: true})}
          {field('address1', 'Address', {
            required: true,
            autoComplete: 'address-line1',
          })}
          {field('address2', 'Apartment, suite, etc.', {
            autoComplete: 'address-line2',
          })}
          {field('city', 'City', {
            required: true,
            autoComplete: 'address-level2',
          })}
          <div className="portal-form-field">
            <label htmlFor="zoneCode">
              State<span aria-hidden="true">*</span>
            </label>
            <select
              id="zoneCode"
              name="zoneCode"
              required
              defaultValue=""
              autoComplete="address-level1"
              aria-invalid={missing.has('zoneCode') || undefined}
            >
              <option value="" disabled>
                Select a state
              </option>
              {US_STATES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {field('zip', 'ZIP code', {
            required: true,
            autoComplete: 'postal-code',
            inputMode: 'numeric',
          })}
          <div className="portal-form-field">
            <label htmlFor="otherLocations">
              Other locations you operate (optional)
            </label>
            <textarea id="otherLocations" name="otherLocations" rows={3} />
          </div>
        </fieldset>

        {portal.onboardingFields.length > 0 && (
          <fieldset>
            <legend>Franchise details</legend>
            {portal.onboardingFields.map((f) => (
              <div key={f.name}>
                {field(f.name, f.label, {required: !!f.required})}
              </div>
            ))}
          </fieldset>
        )}

        <button type="submit" className="portal-button" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit for verification'}
        </button>
      </Form>
    </section>
  );
}
