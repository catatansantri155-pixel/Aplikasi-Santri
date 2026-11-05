import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monitoring Santri Minhajus Sunnah",
    short_name: "Monitoring Santri",
    description: "Monitoring santri Minhajus Sunnah Magelang",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f7f1",
    theme_color: "#165d4e",
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
