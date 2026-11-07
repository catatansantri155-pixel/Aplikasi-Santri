import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import AksesPwa from "@/components/AksesPwa";
import Kerangka from "@/components/Kerangka";
import "./globals.css";
import "./ui.css";
import "./beranda.css";
import "./analitik.css";
import "./akses.css";
import "./pondok.css";
import "./dashboard-pc.css";
import "./profil-scroll.css";
import "./semester.css";
import "./notifikasi.css";
import "./perizinan.css";
import "./keuangan.css";
import "./layanan.css";
import "./pondok-layanan.css";
import "./panduan-pwa.css";

export const metadata: Metadata = {
  title: "Monitoring Santri | Minhajus Sunnah",
  applicationName: "Monitoring Santri",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Monitoring Santri",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/brand/logo-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/logo-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/brand/logo-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  description:
    "Aplikasi monitoring santri Marhalah Wustha: hifzh, diniyyah, kehadiran, dan catatan musyrif.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#155c5b",
};

/**
 * Skrip penerapan tampilan SEBELUM gambar pertama: membaca pilihan
 * mode Terang/Gelap & ukuran teks dari localStorage (Pengaturan di
 * halaman Akun, lib/tampilan.ts) dan menyetel atribut data-tema /
 * data-teks pada <html>, agar tidak ada kedipan tema saat halaman
 * dibuka. Tanpa pilihan tersimpan, tema mengikuti setelan sistem.
 */
const SKRIP_TAMPILAN_AWAL = `(function(){try{var t=localStorage.getItem("santri.tampilan.tema");if(t!=="gelap"&&t!=="terang"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"gelap":"terang";}document.documentElement.dataset.tema=t;var u=localStorage.getItem("santri.tampilan.teks");if(u==="kecil"||u==="standar"||u==="besar"){document.documentElement.dataset.teks=u;}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TAMPILAN_AWAL }} />
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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Amiri:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AksesPwa>
          <Kerangka>{children}</Kerangka>
        </AksesPwa>
      </body>
    </html>
  );
}
