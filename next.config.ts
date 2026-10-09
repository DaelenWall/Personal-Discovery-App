import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/phone",
        headers: [{ key: "X-Commonplace-Phone", value: "1" }],
      },
      {
        source: "/phone-sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/phone" },
        ],
      },
    ];
  },
};
export default config;
