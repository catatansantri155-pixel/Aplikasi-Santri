import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monitoring Santri Minhajus Sunnah",
    short_name: "Monitoring Santri",
    description: "Monitoring santri Minhajus Sunnah Magelang",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f8fa",
    theme_color: "#155c5b",
    lang: "id",
    icons: [
      {
        src: "/brand/logo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
