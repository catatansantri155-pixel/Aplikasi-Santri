/**
 * PETA AKSES MODUL PER PERAN — satu-satunya sumber kebenaran gerbang
 * fitur di LEVEL TAMPILAN (mode Supabase).
 *
 * Dipakai bersama oleh:
 * - navigasi kerangka (src/components/NavTautan.tsx),
 * - kartu modul di beranda (src/app/page.tsx),
 * - penjaga per halaman (src/components/PenjagaModul.tsx).
 * Jangan menuliskan daftar peran modul di tempat lain; ubah di sini.
 *
 * Catatan cakupan:
 * - Ini gerbang TAMPILAN: menyembunyikan menu/kartu/form dari peran
 *   yang tidak berhak dan menolak render isi modul lewat URL langsung.
 *   Penegakan keamanan yang sesungguhnya tetap RLS Supabase (wali hanya
 *   menerima baris anaknya sendiri, dsb.).
 * - MODE CONTOH (env Supabase kosong) TIDAK memakai peta ini sama
 *   sekali: semua menu & modul tampil seperti perilaku semula.
 * - Bentuk-bentuk form di dalam modul mengikuti modulnya: form
 *   kehadiran cepat ada di halaman Kehadiran, form setoran & ujian
 *   hifzh di halaman Hifzh, form catatan di halaman Catatan — semuanya
 *   terjaga oleh gerbang modul halamannya. Halaman detail santri hanya
 *   berisi tampilan baca (tanpa form), jadi wali yang membuka anaknya
 *   memang hanya-lihat murni. Satu-satunya pengecualian di dalam
 *   halaman: REVISI kehadiran tetap khusus admin (lihat
 *   bolehRevisiKehadiran di bawah), sesuai aturan yang sudah ada.
 */
import { PERAN, SEMUA_PERAN, type Peran } from "@/lib/peran";

/** Kunci modul yang dipakai navigasi, kartu beranda, dan penjaga. */
export type KunciModul =
  | "beranda"
  | "santri"
  | "kehadiran"
  | "hifzh"
  | "diniyyah"
  | "catatan"
  | "rekap"
  | "olahraga"
  | "admin"
  | "menu"
  | "akun";

/**
 * Peran yang BOLEH membuka tiap modul (mode Supabase).
 * - beranda & santri: semua peran (wali memang hanya menerima anaknya
 *   sendiri dari RLS, jadi daftar santri aman dibuka semua peran).
 * - kehadiran: admin + kedua pengajar (musyrif & wali tidak).
 * - hifzh: admin + pengajar hifzh.
 * - diniyyah: admin + pengajar diniyyah.
 * - catatan: admin + kedua pengajar + musyrif (wali tidak).
 * - rekap: admin + kedua pengajar + musyrif (wali tidak; ringkasan
 *   anaknya tersedia di beranda & detail santri).
 * - olahraga: admin + kedua pengajar + musyrif (semua staf; wali
 *   tidak membuka modulnya — kehadiran olahraga anaknya sendiri tetap
 *   terbaca lewat RLS di database, bukan lewat modul ini).
 * - admin: HANYA admin (panel kelola data induk: santri, semester,
 *   tautan wali). Semua peran lain ditolak, termasuk lewat URL
 *   langsung; di database, tulis santri/semester/wali_santri memang
 *   hanya lolos untuk admin (kebijakan *_tulis_admin di 0003_rls.sql).
 */
export const PETA_AKSES_MODUL: Record<KunciModul, Peran[]> = {
  beranda: [...SEMUA_PERAN],
  santri: [...SEMUA_PERAN],
  kehadiran: [PERAN.ADMIN, PERAN.PENGAJAR_HIFZH, PERAN.PENGAJAR_DINIYYAH],
  hifzh: [PERAN.ADMIN, PERAN.PENGAJAR_HIFZH],
  diniyyah: [PERAN.ADMIN, PERAN.PENGAJAR_DINIYYAH],
  catatan: [
    PERAN.ADMIN,
    PERAN.PENGAJAR_HIFZH,
    PERAN.PENGAJAR_DINIYYAH,
    PERAN.MUSYRIF,
  ],
  rekap: [
    PERAN.ADMIN,
    PERAN.PENGAJAR_HIFZH,
    PERAN.PENGAJAR_DINIYYAH,
    PERAN.MUSYRIF,
  ],
  olahraga: [
    PERAN.ADMIN,
    PERAN.PENGAJAR_HIFZH,
    PERAN.PENGAJAR_DINIYYAH,
    PERAN.MUSYRIF,
  ],
  admin: [PERAN.ADMIN],
  // menu & akun: halaman kerangka untuk pengguna yang SUDAH login
  // (semua peran). Bukan modul data — isinya tersaring peran lagi
  // (menu hanya memuat modul yang boleh dibuka peran itu; akun hanya
  // menampilkan profil sendiri). Anonim tidak sampai ke sini karena
  // penjaga kerangka mengarahkannya ke /login.
  menu: [...SEMUA_PERAN],
  akun: [...SEMUA_PERAN],
};

/**
 * True bila peran boleh membuka modul. Peran yang belum diketahui
 * (null/undefined — profil belum termuat atau belum terdaftar) selalu
 * false, agar fitur terbatas tidak pernah tampil sebelum dipastikan.
 */
export function bolehAksesModul(
  peran: Peran | null | undefined,
  modul: KunciModul,
): boolean {
  if (!peran) return false;
  return PETA_AKSES_MODUL[modul].includes(peran);
}

/**
 * True bila modul boleh dibuka SEMUA peran. Dipakai saat profil belum
 * termuat: hanya modul semacam ini yang aman ditampilkan (tidak ada
 * kedipan fitur terlarang untuk peran mana pun).
 */
export function modulUntukSemuaPeran(modul: KunciModul): boolean {
  return SEMUA_PERAN.every((peran) =>
    PETA_AKSES_MODUL[modul].includes(peran),
  );
}

/** Revisi status kehadiran: khusus admin, di semua mode tampilan. */
export function bolehRevisiKehadiran(
  peran: Peran | null | undefined,
): boolean {
  return peran === PERAN.ADMIN;
}

/** Pesan baku saat peran membuka modul yang tidak berhak dibukanya. */
export const PESAN_TIDAK_ADA_AKSES =
  "Anda tidak memiliki akses ke modul ini untuk peran Anda.";

/** Petakan pathname (App Router) ke kunci modulnya; null bila bukan modul. */
export function modulDariPath(pathname: string): KunciModul | null {
  if (pathname === "/") return "beranda";
  if (pathname === "/santri" || pathname.startsWith("/santri/")) {
    return "santri";
  }
  if (pathname === "/kehadiran") return "kehadiran";
  if (pathname === "/hifzh") return "hifzh";
  if (pathname === "/diniyyah") return "diniyyah";
  if (pathname === "/catatan") return "catatan";
  if (pathname === "/rekap") return "rekap";
  if (pathname === "/olahraga") return "olahraga";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }
  if (pathname === "/menu") return "menu";
  if (pathname === "/akun") return "akun";
  return null;
}
