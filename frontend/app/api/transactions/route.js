import { apiFetch } from '@/lib/api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const data = await apiFetch(`/transactions${qs ? '?' + qs : ''}`);
    return Response.json(data);
  } catch (e) {
    return Response.json(e.body || { error: 'upstream error' }, { status: e.status || 502 });
  }
}
