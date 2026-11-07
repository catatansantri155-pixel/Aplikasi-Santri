import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;

// Menyelaraskan `next dev` lokal dengan runtime Cloudflare (binding dsb.)
// sesuai pola resmi OpenNext. Tidak berpengaruh pada build produksi.
initOpenNextCloudflareForDev();
