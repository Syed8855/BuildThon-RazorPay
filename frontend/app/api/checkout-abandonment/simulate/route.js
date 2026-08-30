import { apiFetch } from '@/lib/api';

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await apiFetch('/checkout-abandonment/simulate', { method: 'POST', body: JSON.stringify(body) });
    return Response.json(data);
  } catch (e) {
    return Response.json(e.body || { error: 'upstream error' }, { status: e.status || 502 });
  }
}
