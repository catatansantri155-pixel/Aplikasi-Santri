import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;

// Menyelaraskan `next dev` lokal dengan runtime Cloudflare (binding dsb.)
// sesuai pola resmi OpenNext. Tidak berpengaruh pada build produksi.
initOpenNextCloudflareForDev();
