import { apiFetch } from '@/lib/api';
import { MOCK_ANALYTICS_SUMMARY } from '@/lib/merchantData';

export async function GET() {
  try {
    const data = await apiFetch('/analytics');
    return Response.json(data);
  } catch (e) {
    // Return rich mock analytics when backend is initializing or in mock mode
    return Response.json(MOCK_ANALYTICS_SUMMARY);
  }
}

