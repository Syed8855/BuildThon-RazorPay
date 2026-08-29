/** @type {import('next').NextConfig} */
const nextConfig = {
  // All FastAPI calls go server-side through /api/* routes.
  // FASTAPI_BASE_URL is never exposed to the browser.
  env: {},
};

export default nextConfig;
