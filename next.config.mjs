/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // prevent caching of auth pages and API routes
  async headers() {
    return [
      {
        source: "/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },

  // VERY important — prevents /auth/callback from being rendered at build time
  experimental: {
    dynamicIO: true, // enables better dynamic routing
  }
};

export default nextConfig;
