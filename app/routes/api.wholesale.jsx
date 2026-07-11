import {shopifyAdminFetch} from '~/lib/shopifyAdmin';

const REQUIRED_FIELDS = [
  'buyerType',
  'meetsMinimumOrder',
  'hasBusinessWebsite',
  'hasBusinessDocuments',
  'firstName',
  'lastName',
  'email',
  'companyName',
  'businessWebsite',
  'businessAddress',
  'howHeard',
];

const WHOLESALE_APPLICANT_TAG = 'Wholesale Applicant';

// Shopify's customerCreate/customerUpdate require E.164 (e.g. +11234567890).
// Assume a bare 10-digit number is a US number, since this form has no
// separate country field.
function normalizePhone(phone) {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function action({request, context}) {
  if (request.method !== 'POST') {
    return Response.json({error: 'Method not allowed'}, {status: 405});
  }

  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries());

  const missing = REQUIRED_FIELDS.filter((field) => !data[field]?.trim());
  if (missing.length) {
    return Response.json(
      {error: `Missing required field(s): ${missing.join(', ')}`},
      {status: 400},
    );
  }

  try {
    const {customers} = await shopifyAdminFetch(context.env, {
      query: CUSTOMER_BY_EMAIL_QUERY,
      variables: {query: `email:${data.email}`},
    });

    const existingCustomer = customers?.nodes?.[0] ?? null;
    const submittedAt = new Date().toISOString();
    const summary = buildApplicationSummary(data, submittedAt);
    const note = existingCustomer?.note
      ? `${existingCustomer.note}\n\n---\n${summary}`
      : summary;

    const input = {
      ...(existingCustomer ? {id: existingCustomer.id} : {}),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      ...(data.phone ? {phone: normalizePhone(data.phone)} : {}),
      note,
      metafields: buildMetafields(data, submittedAt),
    };

    const mutationResult = await shopifyAdminFetch(context.env, {
      query: existingCustomer
        ? CUSTOMER_UPDATE_MUTATION
        : CUSTOMER_CREATE_MUTATION,
      variables: {input},
    });

    const payload = existingCustomer
      ? mutationResult.customerUpdate
      : mutationResult.customerCreate;

    if (payload.userErrors?.length) {
      return Response.json(
        {error: payload.userErrors.map((e) => e.message).join(', ')},
        {status: 400},
      );
    }

    await shopifyAdminFetch(context.env, {
      query: TAGS_ADD_MUTATION,
      variables: {id: payload.customer.id, tags: [WHOLESALE_APPLICANT_TAG]},
    });

    return Response.json({success: true});
  } catch (error) {
    console.error('Wholesale application submission failed:', error);
    return Response.json(
      {error: 'Something went wrong. Please try again.'},
      {status: 500},
    );
  }
}

function normalizeUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function buildMetafields(data, submittedAt) {
  const fields = [
    ['wholesale_buyer_type', 'single_line_text_field', data.buyerType],
    [
      'wholesale_meets_minimum_order',
      'boolean',
      data.meetsMinimumOrder === 'yes' ? 'true' : 'false',
    ],
    [
      'wholesale_has_business_website',
      'boolean',
      data.hasBusinessWebsite === 'yes' ? 'true' : 'false',
    ],
    [
      'wholesale_has_business_documents',
      'boolean',
      data.hasBusinessDocuments === 'yes' ? 'true' : 'false',
    ],
    ['wholesale_company_name', 'single_line_text_field', data.companyName],
    ['wholesale_business_website', 'url', normalizeUrl(data.businessWebsite)],
    [
      'wholesale_business_address',
      'single_line_text_field',
      data.businessAddress,
    ],
    ['wholesale_ein_tax_id', 'single_line_text_field', data.einTaxId],
    [
      'wholesale_estimated_monthly_volume',
      'single_line_text_field',
      data.estimatedMonthlyVolume,
    ],
    ['wholesale_how_heard', 'single_line_text_field', data.howHeard],
    ['wholesale_notes', 'multi_line_text_field', data.notes],
    ['wholesale_submitted_at', 'date_time', submittedAt],
  ];

  return fields
    .filter(([, , value]) => value)
    .map(([key, type, value]) => ({namespace: 'custom', key, type, value}));
}

function buildApplicationSummary(data, submittedAt) {
  return [
    `Wholesale Application (submitted ${submittedAt})`,
    `Buyer type: ${data.buyerType}`,
    `Meets 50-unit minimum: ${data.meetsMinimumOrder}`,
    `Has business website: ${data.hasBusinessWebsite}`,
    `Has business documents: ${data.hasBusinessDocuments}`,
    `Company: ${data.companyName}`,
    `Business website: ${data.businessWebsite}`,
    `Business address: ${data.businessAddress}`,
    data.einTaxId && `EIN / Tax ID: ${data.einTaxId}`,
    data.estimatedMonthlyVolume &&
      `Estimated monthly volume: ${data.estimatedMonthlyVolume}`,
    `How they heard about us: ${data.howHeard}`,
    data.notes && `Notes: ${data.notes}`,
  ]
    .filter(Boolean)
    .join('\n');
}

const CUSTOMER_BY_EMAIL_QUERY = `#graphql
  query CustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      nodes {
        id
        note
      }
    }
  }
`;

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation CustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CUSTOMER_UPDATE_MUTATION = `#graphql
  mutation CustomerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const TAGS_ADD_MUTATION = `#graphql
  mutation TagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
