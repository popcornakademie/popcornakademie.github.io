/**
 * Court Side Kino – Payment Worker
 * Handles SumUp payment integration
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/checkout' && request.method === 'POST') {
        return await handleCheckout(request, env);
      }

      if (url.pathname === '/status' && request.method === 'GET') {
        return await handleStatus(url, env);
      }

      if (url.pathname === '/webhook' && request.method === 'POST') {
        return await handleWebhook(request, env);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      console.error('Payment worker error:', err);
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

/**
 * Create a SumUp checkout session
 */
async function handleCheckout(request, env) {
  const { amount, currency, reference, description, return_url, ticket_id } = await request.json();

  if (!amount || !reference) {
    return jsonResponse({ error: 'Missing required fields: amount, reference' }, 400);
  }

  const checkoutData = {
    checkout_reference: reference,
    amount: parseFloat(amount),
    currency: currency || 'EUR',
    merchant_code: env.SUMUP_MERCHANT_CODE,
    description: description || 'Court Side Kino Ticket',
    return_url: return_url || 'https://popcornakademie.github.io/kino/buchung-erfolgreich.html',
  };

  const res = await fetch('https://api.sumup.com/v0.1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SUMUP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(checkoutData),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SumUp API error: ${err}`);
  }

  const checkout = await res.json();

  return jsonResponse({
    checkout_id: checkout.id,
    checkout_url: `https://pay.sumup.com/b2c/${checkout.id}`,
    status: checkout.status,
    ticket_id,
  });
}

/**
 * Check payment status
 */
async function handleStatus(url, env) {
  const checkoutId = url.searchParams.get('checkout_id');
  if (!checkoutId) {
    return jsonResponse({ error: 'Missing checkout_id' }, 400);
  }

  const res = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
    headers: {
      'Authorization': `Bearer ${env.SUMUP_API_KEY}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SumUp API error: ${err}`);
  }

  const checkout = await res.json();

  return jsonResponse({
    checkout_id: checkout.id,
    status: checkout.status,
    amount: checkout.amount,
    currency: checkout.currency,
    transaction_id: checkout.transaction_id,
  });
}

/**
 * Handle SumUp webhook for payment updates
 */
async function handleWebhook(request, env) {
  const payload = await request.json();

  // Log webhook for debugging
  console.log('SumUp webhook:', JSON.stringify(payload));

  // Process payment status update
  if (payload.event_type === 'checkout.payment_received') {
    const { checkout_id, transaction_id, status } = payload;

    return jsonResponse({
      received: true,
      checkout_id,
      transaction_id,
      status,
    });
  }

  return jsonResponse({ received: true });
}
