import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Kerangka from "@/components/Kerangka";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aplikasi Santri — Ponpes Minhajus Sunnah Magelang",
  description:
    "Aplikasi monitoring santri Marhalah Wustha: hifzh, diniyyah, kehadiran, dan catatan musyrif.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#006b4f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/*
          Huruf sistem desain: Plus Jakarta Sans (Panduan Desain).
          Dimuat lewat <link> Google Fonts agar tidak menambah
          dependensi npm; bila luring, tumpukan font sistem di
          globals.css menjadi cadangan yang aman.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Kerangka>{children}</Kerangka>
      </body>
    </html>
  );
}
