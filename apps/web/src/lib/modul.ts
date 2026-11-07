/**
 * Metadata modul untuk tampilan — SATU sumber untuk kisi Fast Menu
 * di beranda (src/app/page.tsx) dan halaman Menu (src/app/menu).
 *
 * Kunci `modul` merujuk ke peta terpusat src/lib/akses.ts: entri hanya
 * ditampilkan bila peran pengguna yang login berhak membuka modul itu
 * (bolehAksesModul). Urutan di daftar ini = urutan tampil di kisi.
 */
import type { KunciModul } from "@/lib/akses";
import type { NamaIkon, WarnaTint } from "@/components/Ikon";

export interface InfoModul {
  href: string;
  label: string;
  keterangan: string;
  modul: KunciModul;
  gambar?: string;
  ikon: NamaIkon;
  warna: WarnaTint;
}

/* Urutan mengikuti kisi modul prototipe: Hifzh, Kehadiran,
   Diniyyah, Olahraga, Catatan, Laporan, Panel Admin, Santri. */
export const DAFTAR_MODUL: InfoModul[] = [
  {
    href: "/hifzh",
    label: "Hifzh",
    keterangan: "Setoran Buku Hafalan dan tes semester per juz.",
    modul: "hifzh",
    ikon: "hifzh",
    warna: "biru",
  },
  {
    href: "/kehadiran",
    label: "Kehadiran",
    keterangan: "Isi kehadiran sesi hifzh & diniyyah, revisi khusus admin.",
    modul: "kehadiran",
    ikon: "kehadiran",
    warna: "emas",
  },
  {
    href: "/diniyyah",
    label: "Diniyyah",
    keterangan: "Nilai harian dan nilai ujian semester.",
    modul: "diniyyah",
    ikon: "diniyyah",
    warna: "hijau",
  },
  {
    href: "/olahraga",
    label: "Olahraga",
    keterangan: "Sesi olahraga Ahad & Kamis pagi dan kehadiran per santri.",
    modul: "olahraga",
    ikon: "olahraga",
    warna: "emas",
  },
  {
    href: "/catatan",
    label: "Catatan",
    keterangan: "Catatan keseharian santri oleh pengajar & musyrif.",
    modul: "catatan",
    ikon: "catatan",
    warna: "kuning",
  },
  {
    href: "/laporan",
    label: "Laporan",
    keterangan:
      "Ringkasan visual dan rincian tabel kehadiran, hifzh, diniyyah, dan olahraga.",
    modul: "laporan",
    ikon: "rekap",
    warna: "biru",
  },
  {
    href: "/admin",
    label: "Panel Admin",
    keterangan: "Kelola santri, semester, dan tautan akun wali.",
    modul: "admin",
    ikon: "perisai",
    warna: "emas",
  },
  {
    href: "/santri",
    label: "Santri",
    keterangan: "Daftar santri per kelas.",
    modul: "santri",
    ikon: "santri",
    warna: "hijau",
  },
];
