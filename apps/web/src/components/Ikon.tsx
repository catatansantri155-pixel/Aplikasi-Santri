/**
 * Kumpulan ikon SVG bersama — SATU-SATUNYA sumber ikon aplikasi.
 *
 * Gaya mengikuti Panduan Desain: garis (stroke 1.8), ujung membulat,
 * tanpa emoji sebagai ikon, ukuran baku 20–24px. Ikon selalu dirender
 * lewat komponen <Ikon nama="..."/> agar konsisten; pada daftar, ikon
 * dibungkus <LingkaranIkon/> (lingkaran tint 40px).
 *
 * Gambar murni dekoratif (aria-hidden) — makna disampaikan teks di
 * sebelahnya.
 */
import type { ReactNode } from "react";

export type NamaIkon =
  | "beranda"
  | "menu"
  | "akun"
  | "santri"
  | "kehadiran"
  | "hifzh"
  | "diniyyah"
  | "catatan"
  | "rekap"
  | "olahraga"
  | "keluar"
  | "masuk"
  | "cari"
  | "chevron-kanan"
  | "panah-kiri"
  | "kalender"
  | "peringatan"
  | "bintang"
  | "bulan"
  | "hati"
  | "perisai"
  | "lapisan"
  | "centang"
  | "jam"
  | "pena";

const JALUR: Record<NamaIkon, ReactNode> = {
  beranda: (
    <>
      <path d="M4 11.2 12 4l8 7.2" />
      <path d="M6 9.6V20h12V9.6" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  menu: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  akun: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3.2" />
      <path d="M5.8 19.2c1-2.7 3.3-4.1 6.2-4.1s5.2 1.4 6.2 4.1" />
    </>
  ),
  santri: (
    <>
      <circle cx="9" cy="8.2" r="3.2" />
      <path d="M3.6 19.4c.6-3 2.7-4.6 5.4-4.6s4.8 1.6 5.4 4.6" />
      <circle cx="17.2" cy="9.2" r="2.5" />
      <path d="M15.9 14.9c2.2.3 3.9 1.7 4.5 4.1" />
    </>
  ),
  kehadiran: (
    <>
      <path d="M9 4.6H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6.6a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9.2 14.2 2 2 3.8-4.4" />
    </>
  ),
  hifzh: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  diniyyah: (
    <>
      <path d="M2 3.5h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 3.5h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </>
  ),
  catatan: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13.5h6M9 17h4.5" />
    </>
  ),
  rekap: (
    <>
      <path d="M3 3v18h18" />
      <path d="M8 16v-5" />
      <path d="M13 16V8" />
      <path d="M18 16v-8" />
    </>
  ),
  olahraga: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.2 15.3 10.6l-1.25 3.9h-4.1L8.7 10.6z" />
      <path d="M12 3.1v5.1M15.3 10.6l4.5-1.5M14.05 14.5l2.3 3.8M9.95 14.5l-2.3 3.8M8.7 10.6l-4.5-1.5" />
    </>
  ),
  keluar: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  masuk: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17-5-5 5-5" />
      <path d="M5 12h14" />
    </>
  ),
  cari: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.4-4.4" />
    </>
  ),
  "chevron-kanan": <path d="m9 5 7 7-7 7" />,
  "panah-kiri": <path d="m15 5-7 7 7 7" />,
  kalender: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </>
  ),
  peringatan: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5h.01" />
    </>
  ),
  bintang: (
    <path d="m12 3.5 2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2l-5.1 2.7 1.1-5.6L3.8 9.4l5.7-.7z" />
  ),
  bulan: (
    <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a7 7 0 0 0 9.7 9.7z" />
  ),
  hati: (
    <path d="M12 20.3S4 15.3 4 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.6c0 5.7-8 10.7-8 10.7z" />
  ),
  perisai: (
    <>
      <path d="M12 21.5s7.5-3.4 7.5-9.5V5.2L12 2.5 4.5 5.2V12c0 6.1 7.5 9.5 7.5 9.5z" />
      <path d="m9 11.6 2.2 2.2 3.8-4.2" />
    </>
  ),
  lapisan: (
    <>
      <path d="m12 3 9 4.9-9 4.9-9-4.9z" />
      <path d="m3.6 12.7 8.4 4.6 8.4-4.6" />
    </>
  ),
  centang: <path d="M20 6.5 9.2 17.3 4 12.1" />,
  jam: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  pena: (
    <>
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.6 20.4 2 22l1.6-5.6z" />
      <path d="m15 5 4 4" />
    </>
  ),
};

export function Ikon({
  nama,
  ukuran = 20,
}: {
  nama: NamaIkon;
  ukuran?: number;
}) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: "block" }}
    >
      {JALUR[nama]}
    </svg>
  );
}

export type WarnaTint = "hijau" | "emas" | "biru" | "merah" | "kuning";

/**
 * Ikon di dalam lingkaran tint — pola daftar pada Panduan Desain.
 * Ukuran baku 40px; varian `besar` (56px) untuk kisi Fast Menu.
 */
export function LingkaranIkon({
  nama,
  warna = "hijau",
  ukuran = 20,
  besar = false,
}: {
  nama: NamaIkon;
  warna?: WarnaTint;
  ukuran?: number;
  besar?: boolean;
}) {
  return (
    <span
      className={`ikon-lingkaran ikon-lingkaran--${warna}${
        besar ? " ikon-lingkaran--besar" : ""
      }`}
    >
      <Ikon nama={nama} ukuran={ukuran} />
    </span>
  );
}
