import { apiFetch } from '@/lib/api';

export async function POST(request) {
  let body;
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

  try {
    const data = await apiFetch('/checkout-abandonment/simulate', { method: 'POST', body: JSON.stringify(body) });
    return Response.json(data);
  } catch (e) {
    return Response.json(e.body || { error: 'upstream error' }, { status: e.status || 500 });
  }
}
