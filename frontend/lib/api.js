// lib/api.js — server-side fetch helpers for Next.js API routes.
// Environment-aware: Goes straight to production URL on Vercel/production,
// and only checks localhost:8000 in local development mode.

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const REMOTE_URL = process.env.FASTAPI_BASE_URL || 'https://payment-recovery-api.onrender.com';
const LOCAL_URL = 'http://127.0.0.1:8000';

export async function apiFetch(path, options = {}) {
  const targets = [];

  if (isProduction) {
    // In production / Vercel: Go DIRECTLY to remote production backend (zero localhost latency)
    targets.push(`${REMOTE_URL}${path}`);
  } else {
    // In local development: Prioritize local FastAPI server, then fall back to remote
    targets.push(`${LOCAL_URL}${path}`);
    if (REMOTE_URL && REMOTE_URL !== LOCAL_URL) {
      targets.push(`${REMOTE_URL}${path}`);
    }
  }

  for (const url of targets) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), isProduction ? 25000 : 3500);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        next: { revalidate: 0 },
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (res.ok) {
        return data;
      }
      if (res.status === 422 || res.status === 400) {
        throw { status: res.status, body: data };
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err.status) throw err;
      // In dev mode, if localhost connection is refused, try next target
    }
  }

  throw { status: 504, body: { error: 'Backend cold-starting or unreachable' } };
}
