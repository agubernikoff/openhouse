import {checkMaintenanceRedirect} from '~/lib/maintenance';
import {useLoaderData} from 'react-router';
import {useState, useEffect, useRef} from 'react';
import {motion} from 'motion/react';

const HEAR_ABOUT_US_OPTIONS = [
  'Referral / word of mouth',
  'Instagram or social',
  'Google / search',
  'Event or trade show',
  'Existing client',
  'Press or article',
  'Other',
];

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [
    {title: `Openhouse | Wholesale & Distributor Application`},
    {
      rel: 'canonical',
      href: `/wholesale`,
    },
  ];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  await checkMaintenanceRedirect(args);
  return {geoapifyApiKey: args.context.env.PUBLIC_GEOAPIFY_API_KEY};
}

export default function Wholesale() {
  const {geoapifyApiKey} = useLoaderData();
  const [geoapify, setGeoapify] = useState(null);
  const addressContainerRef = useRef(null);

  useEffect(() => {
    if (!geoapifyApiKey) return;
    let cancelled = false;
    Promise.all([
      import('@geoapify/react-geocoder-autocomplete'),
      import('@geoapify/geocoder-autocomplete/styles/minimal.css'),
    ]).then(([mod]) => {
      if (!cancelled) setGeoapify(mod);
    });
    return () => {
      cancelled = true;
    };
  }, [geoapifyApiKey]);

  useEffect(() => {
    if (!geoapify || !addressContainerRef.current) return;
    const input = addressContainerRef.current.querySelector('input');
    input?.setAttribute('autocomplete', 'off-geoapify-addr');
    input?.setAttribute('id', 'businessAddress');
  }, [geoapify]);

  const [buyerType, setBuyerType] = useState('');
  const [meetsMinimumOrder, setMeetsMinimumOrder] = useState('');
  const [hasBusinessWebsite, setHasBusinessWebsite] = useState('');
  const [hasBusinessDocuments, setHasBusinessDocuments] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [einTaxId, setEinTaxId] = useState('');
  const [estimatedMonthlyVolume, setEstimatedMonthlyVolume] = useState('');
  const [howHeard, setHowHeard] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!meetsMinimumOrder || !hasBusinessWebsite || !hasBusinessDocuments) {
      setSubmitStatus('error');
      setErrorMessage('Please answer all qualifying questions.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    const formData = new FormData();
    formData.set('buyerType', buyerType);
    formData.set('meetsMinimumOrder', meetsMinimumOrder);
    formData.set('hasBusinessWebsite', hasBusinessWebsite);
    formData.set('hasBusinessDocuments', hasBusinessDocuments);
    formData.set('firstName', firstName);
    formData.set('lastName', lastName);
    formData.set('email', email);
    formData.set('phone', phone);
    formData.set('companyName', companyName);
    formData.set('businessWebsite', businessWebsite);
    formData.set('businessAddress', businessAddress);
    formData.set('einTaxId', einTaxId);
    formData.set('estimatedMonthlyVolume', estimatedMonthlyVolume);
    formData.set('howHeard', howHeard);
    formData.set('notes', notes);

    try {
      const response = await fetch('/api/wholesale', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Something went wrong.');
      }

      setSubmitStatus('success');
      setBuyerType('');
      setMeetsMinimumOrder('');
      setHasBusinessWebsite('');
      setHasBusinessDocuments('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCompanyName('');
      setBusinessWebsite('');
      setBusinessAddress('');
      const addressInput = addressContainerRef.current?.querySelector('input');
      if (addressInput) addressInput.value = '';
      setEinTaxId('');
      setEstimatedMonthlyVolume('');
      setHowHeard('');
      setNotes('');
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wholesale">
      <div className="wholesale-card">
        <h1 className="wholesale-title">Wholesale & Distributor Application</h1>

        <form className="wholesale-form" onSubmit={handleSubmit}>
          <div className="contact-form-field">
            <label htmlFor="buyerType" className="contact-label">
              Buyer type
            </label>
            <select
              id="buyerType"
              className="contact-input wholesale-select"
              value={buyerType}
              onChange={(e) => setBuyerType(e.target.value)}
              required
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="Wholesale Buyer">Wholesale Buyer</option>
              <option value="Distributor (Reseller)">
                Distributor (Reseller)
              </option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="wholesale-section">
            <h3 className="wholesale-section-title">Qualifying questions</h3>
            <ToggleQuestion
              name="meetsMinimumOrder"
              label="Can you meet our minimum order of 50 units?"
              value={meetsMinimumOrder}
              onChange={setMeetsMinimumOrder}
            />
            <ToggleQuestion
              name="hasBusinessWebsite"
              label="Have a functional, dedicated business website?"
              value={hasBusinessWebsite}
              onChange={setHasBusinessWebsite}
            />
            <ToggleQuestion
              name="hasBusinessDocuments"
              label="Have required business documents (EIN, reseller permit)?"
              value={hasBusinessDocuments}
              onChange={setHasBusinessDocuments}
            />
          </div>

          <div className="contact-form-row">
            <Input
              id="firstName"
              label="First name"
              value={firstName}
              setter={setFirstName}
              required
            />
            <Input
              id="lastName"
              label="Last name"
              value={lastName}
              setter={setLastName}
              required
            />
          </div>
          <div className="contact-form-row">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              setter={setEmail}
              required
            />
            <Input id="phone" label="Phone" value={phone} setter={setPhone} />
          </div>
          <div className="contact-form-row">
            <Input
              id="companyName"
              label="Company / Business name"
              value={companyName}
              setter={setCompanyName}
              required
            />
            <Input
              id="businessWebsite"
              label="Business website"
              value={businessWebsite}
              setter={setBusinessWebsite}
              required
            />
          </div>
          <div className="contact-form-row">
            <div className="contact-form-field">
              <label htmlFor="businessAddress" className="contact-label">
                Business address
              </label>
              {geoapify ? (
                <div ref={addressContainerRef}>
                  <geoapify.GeoapifyContext apiKey={geoapifyApiKey}>
                    <geoapify.GeoapifyGeocoderAutocomplete
                      placeholder="Street, city, state, ZIP, country"
                      lang="en"
                      placeSelect={(place) =>
                        setBusinessAddress(place?.properties?.formatted ?? '')
                      }
                      onUserInput={(value) => setBusinessAddress(value)}
                      skipIcons
                    />
                  </geoapify.GeoapifyContext>
                </div>
              ) : (
                <input
                  id="businessAddress"
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="contact-input"
                  placeholder="Street, city, state, ZIP, country"
                  required
                />
              )}
            </div>
          </div>

          <div className="contact-form-row">
            <Input
              id="einTaxId"
              label="EIN / Tax ID (optional)"
              value={einTaxId}
              setter={setEinTaxId}
            />
            <Input
              id="estimatedMonthlyVolume"
              label="Estimated monthly volume (optional)"
              value={estimatedMonthlyVolume}
              setter={setEstimatedMonthlyVolume}
            />
          </div>

          <div className="contact-form-field">
            <label htmlFor="howHeard" className="contact-label">
              How did you hear about us?
            </label>
            <select
              id="howHeard"
              className="contact-input wholesale-select"
              value={howHeard}
              onChange={(e) => setHowHeard(e.target.value)}
              required
            >
              <option value="" disabled>
                Select one
              </option>
              {HEAR_ABOUT_US_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="contact-form-field">
            <label htmlFor="notes" className="contact-label">
              Notes / anything else
            </label>
            <textarea
              id="notes"
              className="contact-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <button
            type="submit"
            className="wholesale-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
          </button>
          <p className="wholesale-disclaimer">
            Saved to your Shopify customer profile. Storefront always shows
            retail pricing.
          </p>
          {submitStatus === 'success' && (
            <div className="contact-success-message">
              Thank you! Your application has been submitted for review.
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="contact-error-message">
              {errorMessage ||
                'Sorry, there was an error submitting your application. Please try again.'}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function ToggleQuestion({name, label, value, onChange}) {
  return (
    <div className="wholesale-toggle-row">
      <span className="wholesale-toggle-label">{label}</span>
      <div className="wholesale-toggle">
        {['yes', 'no'].map((option) => {
          const isSelected = value === option;
          return (
            <button
              type="button"
              key={option}
              className={`wholesale-toggle-option${isSelected ? ' selected' : ''}`}
              onClick={() => onChange(option)}
            >
              {isSelected && (
                <motion.div
                  layoutId={`toggle-pill-${name}`}
                  className="wholesale-toggle-pill"
                  transition={{type: 'spring', stiffness: 500, damping: 35}}
                />
              )}
              <span className="wholesale-toggle-option-label">
                {option === 'yes' ? 'Yes' : 'No'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Input({
  id,
  label,
  value,
  setter,
  type = 'text',
  placeholder,
  required = false,
}) {
  return (
    <div className="contact-form-field">
      <label htmlFor={id} className="contact-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => setter(e.target.value)}
        className="contact-input"
        placeholder={placeholder || label}
        required={required}
      />
    </div>
  );
}

/** @typedef {import('./+types/wholesale').Route} Route */
