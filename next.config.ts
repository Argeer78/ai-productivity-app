import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,

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

      // (Optional) No cache on dashboard for now
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

export default config;
