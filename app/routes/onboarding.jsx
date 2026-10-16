import {data, redirect} from 'react-router';
import {CREATE_ADDRESS_MUTATION} from '~/graphql/customer-account/CustomerAddressMutations';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {toPublicPortal} from '~/lib/portals';
import {normalizePhone} from '~/lib/phone';
import {adminCustomerUrl, shopifyAdminFetch} from '~/lib/shopifyAdmin';
import {postToSlack} from '~/lib/slack';
import {
  getPortalAccess,
  portalTag,
  setPortalAccess,
} from '~/portal/access.server';
import {verifySignup} from '~/portal/verification.server';
import {PortalOnboarding} from '~/portal/PortalOnboarding';

// Franchise portal sign-up (plan §4.3): collects franchisee details, tags the
// customer `portal:{handle}:pending`, and notifies the portal's Slack channel.

const BASE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'storeName',
  'address1',
  'city',
  'zoneCode',
  'zip',
];

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => [
  {title: `Sign up | ${data?.portal?.name ?? 'Openhouse'}`},
];

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  const {portal, customerAccount} = context;
  if (!portal) throw new Response('Not found', {status: 404});

  const access = await getPortalAccess(context);
  if (!access) return redirect('/account/login');
  if (access.role !== 'none') return redirect('/');

  const {data: customerData} = await customerAccount.query(
    ONBOARDING_CUSTOMER_QUERY,
  );

  return {
    portal: toPublicPortal(portal),
    customer: customerData?.customer ?? null,
  };
}

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const {portal, customerAccount, env} = context;
  if (!portal) throw new Response('Not found', {status: 404});

  const access = await getPortalAccess(context);
  if (!access) return redirect('/account/login');
  if (access.role !== 'none') return redirect('/');

  const formData = await request.formData();
  const value = (name) => String(formData.get(name) ?? '').trim();

  const submission = Object.fromEntries(
    [
      ...BASE_FIELDS,
      'address2',
      'otherLocations',
      ...portal.onboardingFields.map((f) => f.name),
    ].map((name) => [name, value(name)]),
  );

  const required = [
    ...BASE_FIELDS,
    ...portal.onboardingFields.filter((f) => f.required).map((f) => f.name),
  ];
  const missing = required.filter((name) => !submission[name]);
  if (missing.length) {
    return data(
      {error: 'Please fill in all required fields.', missing},
      {status: 400},
    );
  }

  const phone = normalizePhone(submission.phone);
  if (!/^\+\d{10,15}$/.test(phone)) {
    return data(
      {error: 'Please enter a valid phone number.', missing: ['phone']},
      {status: 400},
    );
  }

  try {
    // Name and first location are written as the customer, through the
    // Customer Account API, the same way the account pages do it.
    const {data: updateData} = await customerAccount.mutate(
      CUSTOMER_UPDATE_MUTATION,
      {
        variables: {
          customer: {
            firstName: submission.firstName,
            lastName: submission.lastName,
          },
        },
      },
    );
    const updateErrors = updateData?.customerUpdate?.userErrors ?? [];

    const {data: addressData} = await customerAccount.mutate(
      CREATE_ADDRESS_MUTATION,
      {
        variables: {
          address: {
            company: submission.storeName,
            firstName: submission.firstName,
            lastName: submission.lastName,
            address1: submission.address1,
            address2: submission.address2 || undefined,
            city: submission.city,
            zoneCode: submission.zoneCode,
            zip: submission.zip,
            // Franchise locations are US-only for now
            territoryCode: 'US',
            phoneNumber: phone,
          },
          defaultAddress: true,
        },
      },
    );
    const addressErrors = addressData?.customerAddressCreate?.userErrors ?? [];

    const userErrors = [...updateErrors, ...addressErrors];
    if (userErrors.length) {
      return data(
        {error: userErrors.map((e) => e.message).join(' '), missing: []},
        {status: 400},
      );
    }

    const {customerId} = access;
    const verification = await verifySignup({
      portal,
      customerId,
      submission,
      context,
    });

    const {customer} = await shopifyAdminFetch(env, {
      query: CUSTOMER_NOTE_QUERY,
      variables: {id: customerId},
    });

    const submittedAt = new Date().toISOString();
    const summary = buildSignupSummary(portal, submission, phone, submittedAt);
    const note = customer?.note ? `${customer.note}\n\n${summary}` : summary;

    const noteResult = await shopifyAdminFetch(env, {
      query: CUSTOMER_NOTE_UPDATE_MUTATION,
      variables: {input: {id: customerId, note}},
    });
    throwOnUserErrors('customerUpdate', noteResult.customerUpdate);

    const tagsResult = await shopifyAdminFetch(env, {
      query: TAGS_ADD_MUTATION,
      variables: {id: customerId, tags: [portalTag(portal, verification.role)]},
    });
    throwOnUserErrors('tagsAdd', tagsResult.tagsAdd);

    setPortalAccess(context, customerId, verification.role);

    context.waitUntil(
      notifySlack({
        portal,
        submission,
        phone,
        email: customer?.defaultEmailAddress?.emailAddress,
        verification,
        customerUrl: adminCustomerUrl(env, customerId),
        webhookUrl: env[portal.slackWebhookEnvVar],
      }),
    );

    return redirect('/');
  } catch (error) {
    console.error('Portal onboarding failed:', error);
    return data(
      {error: 'Something went wrong. Please try again.', missing: []},
      {status: 500},
    );
  }
}

export default function Onboarding() {
  return <PortalOnboarding />;
}

function throwOnUserErrors(mutation, payload) {
  if (payload?.userErrors?.length) {
    throw new Error(`${mutation}: ${JSON.stringify(payload.userErrors)}`);
  }
}

function buildSignupSummary(portal, submission, phone, submittedAt) {
  const extraFields = portal.onboardingFields.map(
    (f) => `${f.label}: ${submission[f.name] || '—'}`,
  );
  return [
    `--- ${portal.name} portal sign-up (${submittedAt}) ---`,
    `Name: ${submission.firstName} ${submission.lastName}`,
    `Phone: ${phone}`,
    `Store: ${submission.storeName}`,
    `Address: ${formatAddress(submission)}`,
    ...extraFields,
    `Other locations: ${submission.otherLocations || '—'}`,
  ].join('\n');
}

function formatAddress(s) {
  return [s.address1, s.address2, s.city, `${s.zoneCode} ${s.zip}`]
    .filter(Boolean)
    .join(', ');
}

function notifySlack({
  portal,
  submission,
  phone,
  email,
  verification,
  customerUrl,
  webhookUrl,
}) {
  const name = `${submission.firstName} ${submission.lastName}`;
  const needsReview = verification.role === 'pending';
  const extraFields = portal.onboardingFields.map(
    (f) => `*${f.label}:* ${submission[f.name] || '—'}`,
  );

  return postToSlack(webhookUrl, {
    text: `New ${portal.name} portal sign-up: ${name} (${submission.storeName})`,
    blocks: [
      {
        type: 'header',
        text: {type: 'plain_text', text: `New ${portal.name} portal sign-up`},
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*Status:* ${needsReview ? ':hourglass: ' : ':white_check_mark: '}${verification.reason}`,
            `*Name:* ${name}`,
            `*Email:* ${email || '—'}`,
            `*Phone:* ${phone}`,
            `*Store:* ${submission.storeName}`,
            `*Address:* ${formatAddress(submission)}`,
            ...extraFields,
            `*Other locations:* ${submission.otherLocations || '—'}`,
          ].join('\n'),
        },
      },
      {type: 'divider'},
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: needsReview
            ? `<${customerUrl}|Review in Shopify> — to approve, replace the tag \`${portalTag(portal, 'pending')}\` with \`${portalTag(portal, 'member')}\`.`
            : `<${customerUrl}|View customer in Shopify>`,
        },
      },
    ],
  });
}

const ONBOARDING_CUSTOMER_QUERY = `#graphql
  query PortalOnboardingCustomer {
    customer {
      firstName
      lastName
      emailAddress {
        emailAddress
      }
    }
  }
`;

const CUSTOMER_NOTE_QUERY = `#graphql
  query PortalCustomerNote($id: ID!) {
    customer(id: $id) {
      defaultEmailAddress {
        emailAddress
      }
      note
    }
  }
`;

const CUSTOMER_NOTE_UPDATE_MUTATION = `#graphql
  mutation PortalCustomerNoteUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

const TAGS_ADD_MUTATION = `#graphql
  mutation PortalTagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`;

/** @typedef {import('./+types/onboarding').Route} Route */
