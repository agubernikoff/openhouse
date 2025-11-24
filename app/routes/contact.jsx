import {useLoaderData} from 'react-router';
import React, {useState} from 'react';
import hangers from 'app/assets/hangers.png';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [
    {title: `Hydrogen | Contact`},
    {
      rel: 'canonical',
      href: `/contact`,
    },
  ];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;

  const [] = await Promise.all([
    // Add other queries here, so that they are loaded in parallel
  ]);
  return {};
}

async function action({}) {}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({context, params}) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

export default function Contact() {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  return (
    <div className="contact">
      <div className="contact-hero-img-container">
        <img src={hangers} alt="hangers" />
      </div>
      <h3 className="contact-hero-text">
        Whether you have a question about an order, a product, or would like
        more information about what us, we’d love to hear from you.
      </h3>
      <div className="contact-details-container">
        <div>
          <h3>Contact</h3>
          <p>
            General Inquiries <span>sales@byopenhouse.com</span>
          </p>
          <p>
            Instagram <span>@byopenhouse</span>
          </p>
          <p>
            LinkedIn <span>@byopenhouse</span>
          </p>
        </div>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>
      <form className="contact-form">
        <div className="contact-form-row">
          <Input
            id="firstName"
            label="First Name"
            value={first}
            setter={setFirst}
          />
          <Input
            id="lastName"
            label="Last Name"
            value={last}
            setter={setLast}
          />
        </div>
        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          setter={setEmail}
        />
        <Input
          id="phone"
          label="Phone Number"
          value={phone}
          setter={setPhone}
        />
        <Input
          id="company"
          label="Company Name"
          value={company}
          setter={setCompany}
        />
        <div className="contact-form-field">
          <label htmlFor="message">{'Order / Special Instructions'}</label>
          <textarea
            id="message"
            className="contact-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
          />
        </div>
        <button type="submit" className="contact-submit">
          SUBMIT
        </button>
      </form>
    </div>
  );
}

function Input({id, label, value, setter, type = 'text'}) {
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
        placeholder="placeholder"
      />
    </div>
  );
}
