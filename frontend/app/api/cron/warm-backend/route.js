// app/api/cron/warm-backend/route.js
// Continuous backend warming endpoint for Vercel Cron or external schedulers.
// Keeps Render free-tier instance active by pinging the /health endpoint.

const WARM_TARGET = process.env.FASTAPI_BASE_URL
  ? `${process.env.FASTAPI_BASE_URL}/health`
  : 'https://payment-recovery-api.onrender.com/health';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 24000);

    const res = await fetch(WARM_TARGET, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RazorpayRecovery-BackendWarmer/1.0',
        'Cache-Control': 'no-cache',
      },
      next: { revalidate: 0 },
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;
    const data = await res.json().catch(() => ({}));

    return Response.json({
      success: res.ok,
      status: res.status,
      target: WARM_TARGET,
      latency_ms: latencyMs,
      timestamp: new Date().toISOString(),
      backend_status: data,
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return Response.json(
      {
        success: false,
        status: 504,
        target: WARM_TARGET,
        latency_ms: latencyMs,
        error: error.message || 'Warming ping timed out or failed',
        timestamp: new Date().toISOString(),
      },
      { status: 200 } // Return 200 to cron scheduler with error payload
    );
  }
}
