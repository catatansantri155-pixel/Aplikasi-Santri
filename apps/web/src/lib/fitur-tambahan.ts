import { bolehAksesModul, type KunciModul } from "@/lib/akses";
import type { Peran } from "@/lib/peran";
/** Katalog layanan tambahan; pilihan beranda diatur terpisah sesuai peran. */
const FITUR: {
  href: string;
  label: string;
  gambar: string;
  akses: KunciModul;
}[] = [
  {
    href: "/kalender",
    label: "Kalender",
    gambar: "kalender",
    akses: "kalender",
  },
  {
    href: "/kesehatan",
    label: "Kesehatan",
    gambar: "kesehatan",
    akses: "kesehatan",
  },
  {
    href: "/banner",
    label: "Kelola Banner",
    gambar: "informasi",
    akses: "admin",
  },
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
