// lib/api.js — server-side fetch helpers for Next.js API routes.
// FASTAPI_BASE_URL is only available server-side, never sent to the browser.

const BASE = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

export async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    // Keep-alive for Render free tier cold-start mitigation
    next: { revalidate: 0 },
  });

  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, body: data };
  }
  return data;
}
