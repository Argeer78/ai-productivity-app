import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // You can add other config options here if needed

  async headers() {
    return [
      // 🔒 Never cache auth pages (including /auth/callback)
      {
        source: "/auth/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },

      // 🛰 Never cache API routes
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },

      // (Optional) You can loosen this later, but this keeps dynamic stuff fresh
      {
        source: "/dashboard",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
