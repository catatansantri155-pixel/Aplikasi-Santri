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
      <body>
        <Kerangka>{children}</Kerangka>
      </body>
    </html>
  );
}
