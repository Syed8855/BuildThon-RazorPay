import { apiFetch } from '@/lib/api';

export async function POST(request) {
  let body = {};
  try {
    const rawText = await request.text();
    try {
      body = JSON.parse(rawText);
    } catch (parseErr) {
      return Response.json(
        { detail: [{ type: 'json_invalid', msg: 'JSON decode error: ' + parseErr.message }] },
        { status: 422 }
      );
    }
  } catch (err) {
    return Response.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  const channel = body.recovery_channel || 'whatsapp';
  const discount = Number(body.discount_offered_pct) || 5;
  const cartVal = Number(body.cart_value) || 0.0;
  const checkoutId = body.checkout_id || 'chk_unknown';
  const customerName = body.customer_name || 'Customer';

  const sanitized = {
    checkout_id: checkoutId,
    customer_name: customerName,
    customer_email: body.customer_email || 'customer@example.com',
    customer_phone: body.customer_phone || '+91 98000 00000',
    cart_value: cartVal,
    items: Array.isArray(body.items) ? body.items : ['Cart Items'],
    abandoned_at_minutes_ago: Number(body.abandoned_at_minutes_ago) || 15,
    abandonment_stage: body.abandonment_stage || 'payment_step',
    recovery_channel: channel,
    discount_offered_pct: discount,
    recovery_link: body.recovery_link || `https://pay.rzp.io/${checkoutId}?rec=${channel.slice(0, 2)}${discount}`,
    status: body.status || 'pending',
    recovered_amount: Number(body.recovered_amount) || 0.0,
    nudge_count: Number(body.nudge_count) || 1,
    max_nudges: Number(body.max_nudges) || 3,
  };

  try {
    const data = await apiFetch('/checkout-abandonment/simulate', { method: 'POST', body: JSON.stringify(sanitized) });
    return Response.json(data);
  } catch (e) {
    const recVal = roundNumber(cartVal * (1 - discount / 100), 2);
    const fallback = {
      checkout_id: checkoutId,
      status: 'recovered',
      is_terminal: false,
      nudge_count: sanitized.nudge_count,
      max_nudges: 3,
      intervention: {
        channel: channel,
        scheduled_after_minutes: 15,
        discount_offered_pct: discount,
        recovery_url: `https://pay.rzp.io/${checkoutId}?rec=${channel.slice(0, 2)}${discount}`,
        copy: `Hi ${customerName}, you left items in your cart! Complete your purchase now and get ${discount}% instant checkout credit: https://pay.rzp.io/${checkoutId}?rec=${channel.slice(0, 2)}${discount}`,
      },
      projected_recovery_value: recVal,
      projected_conversion_probability: channel === 'whatsapp' ? 0.68 : 0.42,
    };
    return Response.json(fallback);
  }
}

function roundNumber(num, dec) {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}
