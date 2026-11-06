import { bolehAksesModul, type KunciModul } from "@/lib/akses";
import type { Peran } from "@/lib/peran";
/** Fitur baru didaftarkan di sini, bukan pada daftar Menu Utama beranda. */
const FITUR: {
  href: string;
  label: string;
  gambar: string;
  akses: KunciModul;
}[] = [
  {
    href: "/keuangan",
    label: "Keuangan / SPP",
    gambar: "keuangan",
    akses: "keuangan",
  },
  {
    href: "/perizinan",
    label: "Perizinan Santri",
    gambar: "perizinan",
    akses: "perizinan",
  },
  {
    href: "/informasi",
    label: "Informasi Pondok",
    gambar: "informasi",
    akses: "laporan",
  },
  {
    href: "/notifikasi",
    label: "Notifikasi",
    gambar: "notifikasi",
    akses: "laporan",
  },
  { href: "/akun", label: "Akun", gambar: "akun", akses: "akun" },
];
export function fiturTambahan(peran: Peran | null) {
  return FITUR.filter((f) => bolehAksesModul(peran, f.akses));
}
