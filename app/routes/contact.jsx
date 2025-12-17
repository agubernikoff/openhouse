import {useLoaderData} from 'react-router';
import React, {useState} from 'react';
import emailjs from '@emailjs/browser';
import hangers from 'app/assets/boxes.jpg';

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
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;

  const [] = await Promise.all([]);
  return {};
}

async function action({}) {}

function loadDeferredData({context, params}) {
  return {};
}

export default function Contact() {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Initialize EmailJS with your public key
    emailjs.init('rzBTp542LGt-9PFek');

    try {
      const result = await emailjs.send('service_p8ncxii', 'template_4xfs5ih', {
        firstName: first,
        lastName: last,
        email: email,
        phone: phone,
        company: company,
        message: message,
      });

      console.log('Email sent successfully:', result);
      setSubmitStatus('success');

      // Clear form fields
      setFirst('');
      setLast('');
      setEmail('');
      setPhone('');
      setCompany('');
      setMessage('');
    } catch (error) {
      console.error('Email send failed:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact">
      <div className="contact-hero-img-container">
        <img src={hangers} alt="hangers" />
      </div>
      <h3 className="contact-hero-text">
        We'd love to hear from you. Whether you have a question about an order,
        a product, or would like to partner with us, please use the form below
        to get in touch.
      </h3>
      <div className="contact-details-container">
        <div>
          <h3>Contact</h3>
          <p>
            General Inquiries{' '}
            <span>
              <a href="mailto:sales@byopenhouse.com">sales@byopenhouse.com</a>
            </span>
          </p>
          <p>
            Instagram{' '}
            <span>
              <a
                href="https://instagram.com/byopenhouse"
                target="_blank"
                rel="noopener noreferrer"
              >
                @byopenhouse
              </a>
            </span>
          </p>
          <p>
            LinkedIn{' '}
            <span>
              <a
                href="https://linkedin.com/company/byopenhouse"
                target="_blank"
                rel="noopener noreferrer"
              >
                @byopenhouse
              </a>
            </span>
          </p>
        </div>
      </div>
      <form className="contact-form" onSubmit={handleSubmit}>
        <h3>Email</h3>

        {submitStatus === 'success' && (
          <div className="contact-success-message">
            Thank you! Your message has been sent successfully.
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="contact-error-message">
            Sorry, there was an error sending your message. Please try again or
            email us directly.
          </div>
        )}

        <div className="contact-form-row">
          <Input
            id="firstName"
            label="First Name"
            value={first}
            setter={setFirst}
            required
          />
          <Input
            id="lastName"
            label="Last Name"
            value={last}
            setter={setLast}
            required
          />
        </div>
        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          setter={setEmail}
          required
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
            required
          />
        </div>
        <button
          type="submit"
          className="contact-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
        </button>
      </form>
    </div>
  );
}

function Input({id, label, value, setter, type = 'text', required = false}) {
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
        placeholder={label}
        required={required}
      />
    </div>
  );
}
