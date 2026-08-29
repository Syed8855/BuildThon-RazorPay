// lib/api.js — server-side fetch helpers for Next.js API routes.
// FASTAPI_BASE_URL is only available server-side, never sent to the browser.

const BASE = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

export async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`;
  
  // Abort after 20s if cold-starting so request fails fast and UI shows Vaulta/loading screen
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

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
    if (!res.ok) {
      throw { status: res.status, body: data };
    }
    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err.status) throw err;
    throw { status: 504, body: { error: 'Backend cold-starting or unreachable', details: err.message } };
  }
}
