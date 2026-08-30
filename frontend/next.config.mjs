/** @type {import('next').NextConfig} */
const nextConfig = {
  // All FastAPI calls go server-side through /api/* routes.
  // FASTAPI_BASE_URL is never exposed to the browser.
  env: {},
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
