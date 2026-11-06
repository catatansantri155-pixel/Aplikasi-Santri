/**
 * Konstanta peran pengguna aplikasi santri.
 * Nilai peran ini harus sama persis dengan enum peran di database Supabase
 * (lihat folder supabase/ — Jalur A) agar kebijakan RLS bekerja.
 */

export const PERAN = {
  ADMIN: "admin",
  PENGAJAR_HIFZH: "pengajar_hifzh",
  PENGAJAR_DINIYYAH: "pengajar_diniyyah",
  MUSYRIF: "musyrif",
  WALI: "wali",
} as const;

export type Peran = (typeof PERAN)[keyof typeof PERAN];

export const LABEL_PERAN: Record<Peran, string> = {
  admin: "Admin Utama",
  pengajar_hifzh: "Pengajar Hifzh",
  pengajar_diniyyah: "Pengajar Diniyyah",
  musyrif: "Musyrif",
  wali: "Orang Tua / Wali",
};

export const SEMUA_PERAN: Peran[] = [
  PERAN.ADMIN,
  PERAN.PENGAJAR_HIFZH,
  PERAN.PENGAJAR_DINIYYAH,
  PERAN.MUSYRIF,
  PERAN.WALI,
];

/** Ringkasan kemampuan tiap peran, untuk ditampilkan di dashboard placeholder. */
export const RINGKASAN_PERAN: Record<Peran, string> = {
  admin:
    "Melihat semua data, mengelola santri, kelas, dan pengguna, serta satu-satunya yang dapat merevisi keterangan kehadiran (tercatat di log revisi).",
  pengajar_hifzh:
    "Mengisi kehadiran sesi hifzh, setoran hafalan (Buku Hafalan), dan ujian hifzh semester; melihat semua santri.",
  pengajar_diniyyah:
    "Mengisi kehadiran sesi diniyyah, nilai harian, dan nilai ujian semester; melihat semua santri.",
  musyrif:
    "Mengisi catatan keseharian santri (akhlaq, adab, ibadah shalat, dan lainnya); melihat semua santri.",
  wali:
    "Melihat perkembangan anak yang tertaut dan mengajukan izin santri. Akses dibatasi di level database (RLS).",
};

/** Peran staf: boleh melihat data semua santri. Orang tua TIDAK termasuk. */
export const PERAN_STAF: Peran[] = [
  PERAN.ADMIN,
  PERAN.PENGAJAR_HIFZH,
  PERAN.PENGAJAR_DINIYYAH,
  PERAN.MUSYRIF,
];

export function apakahStaf(peran: Peran): boolean {
  return PERAN_STAF.includes(peran);
}
