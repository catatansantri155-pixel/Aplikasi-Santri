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
 * - Di dalam halaman modul, formulir INPUT AWAL mengikuti peta kedua
 *   (bolehInput di bawah): sejak keputusan user 4 Nov 2026 admin
 *   hanya memantau & mengoreksi, bukan mengisi dari nol.
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
  | "akun"
  | "grafik"
  | "laporan";

/**
 * Peran yang BOLEH membuka tiap modul (mode Supabase).
 * - beranda & santri: semua peran (wali memang hanya menerima anaknya
 *   sendiri dari RLS, jadi daftar santri aman dibuka semua peran).
 * - kehadiran: admin + kedua pengajar (musyrif & wali tidak).
 * - hifzh: admin + pengajar hifzh.
 * - diniyyah: admin + pengajar diniyyah.
 * - catatan: admin + kedua pengajar + musyrif (wali tidak).
 * - rekap: admin + kedua pengajar + musyrif (wali tidak; ringkasan
 *   anaknya tersedia di beranda & detail santri). Kunci ini kini
 *   ALIAS warisan: sejak Fase 2 audit (3 Nov 2026) Rekap & Grafik
 *   dilebur menjadi modul "laporan"; halaman /rekap & /grafik hanya
 *   mengalihkan ke /laporan.
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
  // grafik: halaman visualisasi untuk semua peran yang login
  // (revisi biru 3 Nov 2026, menggantikan slot Menu di navigasi
  // bawah). Semua angkanya berasal dari fungsi data yang sama
  // dengan modul Rekap & modul-modul sumbernya, yang menghormati
  // RLS: staf melihat agregat semua santri, wali hanya agregat
  // anaknya sendiri (atau keadaan kosong yang sopan).
  // Kini ALIAS warisan dari "laporan" (Fase 2 audit).
  grafik: [...SEMUA_PERAN],
  // laporan: peleburan Rekap + Grafik (Fase 2 audit, keputusan user
  // 3 Nov 2026 21:03 mengikuti usulan audit). Satu pintu berisi dua
  // tampilan: ringkasan visual (bekas Grafik) dan rincian tabel
  // (bekas Rekap). Dibuka SEMUA peran yang login — termasuk wali,
  // yang membukanya sebagai "Perkembangan" anaknya: semua angka
  // berasal dari fungsi data yang menghormati RLS, jadi wali hanya
  // menerima agregat anaknya sendiri (gerbang data tetap di RLS,
  // bukan di peta tampilan ini).
  laporan: [...SEMUA_PERAN],
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
  return SEMUA_PERAN.every((peran) => PETA_AKSES_MODUL[modul].includes(peran));
}

/** Revisi status kehadiran: khusus admin, di semua mode tampilan. */
export function bolehRevisiKehadiran(peran: Peran | null | undefined): boolean {
  return peran === PERAN.ADMIN;
}

/**
 * MODE PANTAUAN ADMIN (keputusan user 4 Nov 2026): Admin Utama
 * bertugas MEMANTAU dan MENGOREKSI/REVISI entri yang sudah ada —
 * BUKAN mengisi/menilai dari nol. Formulir input awal hanya tampil
 * untuk peran pemilik tugas tiap modul:
 * - kehadiran: pengajar hifzh & pengajar diniyyah (per sesi masing-
 *   masing; pengetatan per sesi tetap dijaga RLS 0005),
 * - hifzh: pengajar hifzh,
 * - diniyyah: pengajar diniyyah,
 * - catatan: kedua pengajar & musyrif,
 * - olahraga: kedua pengajar & musyrif.
 * Admin TIDAK termasuk di modul mana pun di peta ini. Ini gerbang
 * TAMPILAN di dalam halaman yang memang boleh dibuka admin (lewat
 * PETA_AKSES_MODUL); RLS tidak berubah. MODE CONTOH tidak memakai
 * peta ini (halaman memeriksa sumber datanya sendiri), sama seperti
 * peta akses modul.
 */
export type KunciModulInput = Extract<
  KunciModul,
  "kehadiran" | "hifzh" | "diniyyah" | "catatan" | "olahraga"
>;

export const PETA_INPUT_MODUL: Record<KunciModulInput, Peran[]> = {
  kehadiran: [PERAN.PENGAJAR_HIFZH, PERAN.PENGAJAR_DINIYYAH],
  hifzh: [PERAN.PENGAJAR_HIFZH],
  diniyyah: [PERAN.PENGAJAR_DINIYYAH],
  catatan: [PERAN.PENGAJAR_HIFZH, PERAN.PENGAJAR_DINIYYAH, PERAN.MUSYRIF],
  olahraga: [PERAN.PENGAJAR_HIFZH, PERAN.PENGAJAR_DINIYYAH, PERAN.MUSYRIF],
};

/** True bila peran adalah pemilik tugas yang boleh mengisi formulir awal modul. */
export function bolehInput(
  peran: Peran | null | undefined,
  modul: KunciModulInput,
): boolean {
  if (!peran) return false;
  return PETA_INPUT_MODUL[modul].includes(peran);
}

/**
 * Catatan singkat yang tampil di tempat formulir yang disembunyikan
 * dari admin (mode pantauan). `pemilik` menyebut peran pengisi awal,
 * mis. "pengajar hifzh".
 */
export function pesanModePantauan(pemilik: string): string {
  return (
    `Mode pantauan admin — input awal dilakukan ${pemilik}; ` +
    "admin mengoreksi entri yang sudah ada."
  );
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
  if (pathname === "/menu" || pathname === "/lainnya") return "menu";
  if (
    pathname === "/informasi" ||
    pathname.startsWith("/informasi/") ||
    pathname === "/notifikasi"
  )
    return "laporan";
  if (pathname === "/akun") return "akun";
  if (pathname === "/grafik") return "grafik";
  if (pathname === "/laporan" || pathname.startsWith("/laporan/")) {
    return "laporan";
  }
  return null;
}
