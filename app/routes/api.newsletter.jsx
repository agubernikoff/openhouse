// app/routes/api.newsletter.jsx

export async function action({request, context}) {
  if (request.method !== 'POST') {
    return Response.json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email) {
      return Response.json({error: 'Email is required'}, {status: 400});
    }

    const MAILCHIMP_API_KEY = context.env.MAILCHIMP_API_KEY;
    const MAILCHIMP_LIST_ID = context.env.MAILCHIMP_LIST_ID;
    const MAILCHIMP_SERVER_PREFIX = context.env.MAILCHIMP_SERVER_PREFIX;

    const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MAILCHIMP_API_KEY}`,
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed', // or 'pending' for double opt-in
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle Mailchimp errors
      if (data.title === 'Member Exists') {
        return Response.json(
          {error: 'This email is already subscribed'},
          {status: 400},
        );
      }
      return Response.json(
        {error: data.detail || 'Subscription failed'},
        {status: 400},
      );
    }

    return Response.json({success: true, message: 'Successfully subscribed!'});
  } catch (error) {
    return Response.json({error: 'Something went wrong'}, {status: 500});
  }
}
