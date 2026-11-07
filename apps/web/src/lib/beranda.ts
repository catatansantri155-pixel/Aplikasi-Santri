import { bolehAksesModul } from "@/lib/akses";
import { DAFTAR_MODUL, type InfoModul } from "@/lib/modul";
import type { Peran } from "@/lib/peran";
import type { Santri } from "@/lib/data/santri";

const URUTAN = [
  "santri",
  "kehadiran",
  "hifzh",
  "diniyyah",
  "olahraga",
  "catatan",
  "laporan",
  "admin",
];

/** Satu urutan menu seperti mockup, tetap disaring dengan peta akses aplikasi. */
export function modulBeranda(peran: Peran | null): InfoModul[] {
  if (!peran) return [];
  return DAFTAR_MODUL.filter((m) => bolehAksesModul(peran, m.modul)).sort(
    (a, b) => URUTAN.indexOf(a.modul) - URUTAN.indexOf(b.modul),
  );
}

/** Hanya mencari pada daftar yang telah diberikan lapisan data berizin. */
export function cariDiBeranda(
  kata: string,
  modul: InfoModul[],
  santri: Santri[],
) {
  const q = kata.trim().toLocaleLowerCase("id-ID");
  if (!q) return { modul: [], santri: [] };
  return {
    modul: modul
      .filter((m) =>
        `${m.label} ${m.keterangan}`.toLocaleLowerCase("id-ID").includes(q),
      )
      .sort(
        (a, b) =>
          Number(b.label.toLocaleLowerCase("id-ID").includes(q)) -
          Number(a.label.toLocaleLowerCase("id-ID").includes(q)),
      ),
    santri: santri.filter((s) =>
      `${s.nama} ${s.namaAyahWali} ${s.kelasNama} ${s.nis ?? ""}`
        .toLocaleLowerCase("id-ID")
        .includes(q),
    ),
  };
}

/** Pertahankan modul lama; lengkapi menjadi sedikitnya delapan pintu berizin. */
export function menuUtamaBeranda(peran: Peran | null): InfoModul[] {
  if (!peran) return [];
  const hasil = [...modulBeranda(peran)];
  const ekstra: InfoModul[] = [
    {
      href: "/kalender",
      label: "Kalender",
      modul: "kalender",
      ikon: "kalender",
      warna: "biru",
      keterangan: "Agenda belajar dan kegiatan pondok.",
      gambar: "/images/fitur/kalender.webp",
    },
    {
      href: "/kesehatan",
      label: "Kesehatan",
      modul: "kesehatan",
      ikon: "hati",
      warna: "hijau",
      keterangan: "Catatan kesehatan santri sesuai akses.",
      gambar: "/images/fitur/kesehatan.webp",
    },
    {
      href: "/informasi",
      label: "Informasi",
      modul: "laporan",
      ikon: "catatan",
      warna: "biru",
      keterangan: "Pengumuman terbaru dari pondok.",
      gambar: "/images/fitur/informasi.webp",
    },
    {
      href: "/notifikasi",
      label: "Notifikasi",
      modul: "laporan",
      ikon: "lonceng",
      warna: "emas",
      keterangan: "Pembaruan untuk akun Anda.",
      gambar: "/images/fitur/notifikasi.webp",
    },
    {
      href: "/akun",
      label: "Akun",
      modul: "akun",
      ikon: "akun",
      warna: "biru",
      keterangan: "Profil dan pengaturan akun.",
      gambar: "/images/fitur/akun.webp",
    },
    {
      href: "/lainnya",
      label: "Lainnya",
      modul: "menu",
      ikon: "menu",
      warna: "biru",
      keterangan: "Semua layanan tambahan pondok.",
      gambar: "/images/fitur/lainnya.webp",
    },
  ];
  for (const m of ekstra) {
    if (
      bolehAksesModul(peran, m.modul) &&
      (hasil.length < 8 || m.modul === "kalender" || m.modul === "kesehatan")
    )
      hasil.push(m);
  }
  return hasil;
}
export function gambarMenu(m: InfoModul) {
  return (
    m.gambar ?? `/images/menu/${m.modul === "laporan" ? "rekap" : m.modul}.webp`
  );
}
