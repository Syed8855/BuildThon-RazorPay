import { apiFetch } from '@/lib/api';

export async function GET() {
  try {
    const data = await apiFetch('/checkout-abandonment/events');
    return Response.json(data);
  } catch (e) {
    return Response.json(e.body || { error: 'upstream error' }, { status: e.status || 502 });
  }
}
