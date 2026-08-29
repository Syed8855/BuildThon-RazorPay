import { apiFetch } from '@/lib/api';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await apiFetch(`/transactions/${id}`);
    return Response.json(data);
  } catch (e) {
    return Response.json(e.body || { error: 'upstream error' }, { status: e.status || 502 });
  }
}
