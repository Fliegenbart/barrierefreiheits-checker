import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-Output für Docker-Deployment
  output: "standalone",

  // Experimentelle Features
  experimental: {
    // Server Actions für Datei-Uploads
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

  // Headers für Sicherheit und Barrierefreiheit
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      // Cache-Header für statische Downloads
      {
        source: "/downloads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=3600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
