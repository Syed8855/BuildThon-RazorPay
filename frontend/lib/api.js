// lib/api.js — server-side fetch helpers for Next.js API routes.
// Automatically prioritizes local backend for fast development and falls back to remote Render.

const LOCAL_BASE = 'http://127.0.0.1:8000';
const REMOTE_BASE = process.env.FASTAPI_BASE_URL;

export async function apiFetch(path, options = {}) {
  const targets = [];
  // Prioritize local backend if available
  targets.push(`${LOCAL_BASE}${path}`);
  if (REMOTE_BASE && REMOTE_BASE !== LOCAL_BASE) {
    targets.push(`${REMOTE_BASE}${path}`);
  }

  for (const url of targets) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

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
      // Connection refused or timed out on local, proceed to next target
    }
  }

  throw { status: 504, body: { error: 'Backend cold-starting or unreachable' } };
}
