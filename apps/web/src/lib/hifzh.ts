/**
 * Logika hitung resmi Buku Hafalan — fungsi MURNI (tanpa efek samping).
 *
 * File ini adalah cermin TypeScript dari fungsi SQL di
 * supabase/migrations/0002_functions_views.sql:
 *   public.kb_konversi(rg, kk, kb)  -> kbKonversi()
 *   public.nilai_setoran(...)       -> nilaiSetoran()
 *   public.hasil_ujian(rg, kk, kb)  -> hasilUjian()
 *
 * Bila aturan di SQL berubah, file ini WAJIB diubah mengikuti, dan
 * sebaliknya. Kasus uji manual: src/lib/hifzh.test-contoh.md.
 *
 * Aturan resmi (ABU_SABIQ_1.pdf & ABU_SABIQ_2.pdf):
 *   Konversi BERTAHAP: 3 RG = 1 KK, lalu 3 KK = 1 KB.
 *     kkTotal = kk + floor(rg / 3)
 *     kbTotal = kb + floor(kkTotal / 3)
 *   Nilai setoran: BR/TS -> 'L' hanya bila RG=KK=KB semua 0.
 *                  LM/BC -> 'L' bila KB hasil konversi <= 3.
 *                  (BC tidak disebut di PDF; sementara disamakan LM,
 *                   menunggu konfirmasi user — sama dengan SQL.)
 *   Hasil tes semester per juz dari KB hasil konversi:
 *     0 = M, 1-2 = BS, 3-4 = B, 5-7 = C, 8-10 = K, >= 11 = G.
 */

/** Jenis setoran Buku Hafalan. Sama dengan enum jenis_setoran di SQL. */
export type JenisSetoran = "BC" | "BR" | "TS" | "LM";

/** Nilai setoran: L = Lancar, U = Ulang. */
export type NilaiSetoran = "L" | "U";

/** Hasil tes semester per juz. */
export type HasilUjian = "M" | "BS" | "B" | "C" | "K" | "G";

/** Kode kesalahan: RG / KK / KB. */
export type KodeKesalahan = "RG" | "KK" | "KB";

export const SEMUA_JENIS_SETORAN: JenisSetoran[] = ["BC", "BR", "TS", "LM"];

export const SEMUA_HASIL_UJIAN: HasilUjian[] = ["M", "BS", "B", "C", "K", "G"];

/** Label lengkap jenis setoran (kode -> penjelasan resmi Buku Hafalan). */
export const LABEL_JENIS_SETORAN: Record<JenisSetoran, string> = {
  BC: "BC — Membaca sebelum menghafal tugas berikutnya",
  BR: "BR — Menambah hafalan baru (kadarnya tergantung kemampuan)",
  TS: "TS — Tes hafalan baru (sudah sempurna satu surat; surat panjang dibagi tiga kali setoran)",
  LM: "LM — Hafalan lama (sekali setoran 2 lembar, kecuali penyimak terbatas)",
};

/** Nama singkat jenis setoran, untuk badge dan grafik. */
export const LABEL_JENIS_SINGKAT: Record<JenisSetoran, string> = {
  BC: "BC",
  BR: "BR",
  TS: "TS",
  LM: "LM",
};

/** Label lengkap tiga macam kesalahan (definisi resmi Buku Hafalan). */
export const LABEL_KESALAHAN: Record<KodeKesalahan, string> = {
  RG: "RG — Ragu (mampu memperbaiki sendiri tanpa diingatkan, atau diingatkan 1x)",
  KK: "KK — Kesalahan Kecil (mampu memperbaiki setelah diingatkan minimal 2x)",
  KB: "KB — Kesalahan Besar (tidak mampu memperbaiki setelah diingatkan 3x)",
};

/** Label nilai setoran. */
export const LABEL_NILAI_SETORAN: Record<NilaiSetoran, string> = {
  L: "Lancar",
  U: "Ulang",
};

/** Label lengkap hasil tes semester per juz. */
export const LABEL_HASIL_UJIAN: Record<HasilUjian, string> = {
  M: "Mutqin",
  BS: "Baik Sekali",
  B: "Baik",
  C: "Cukup",
  K: "Kurang",
  G: "Goncang",
};

/**
 * Samakan perlakuan angka dengan SQL: NULL/NaN dianggap 0 (coalesce),
 * pecahan dibulatkan ke bawah, dan nilai negatif dianggap 0
 * (di database nilai negatif memang ditolak constraint CHECK >= 0).
 */
function bersihkanJumlah(nilai: number | null | undefined): number {
  if (nilai === null || nilai === undefined || !Number.isFinite(nilai)) {
    return 0;
  }
  return Math.max(0, Math.floor(nilai));
}

/** Rincian konversi bertahap, untuk ditampilkan di pratinjau nilai. */
export interface RincianKonversi {
  /** KK setelah ditambah hasil konversi RG: kk + floor(rg / 3). */
  kkTotal: number;
  /** KB setelah ditambah hasil konversi KK total: kb + floor(kkTotal / 3). */
  kbTotal: number;
}

/**
 * Konversi kesalahan bertahap sesuai Buku Hafalan.
 * Cermin dari public.kb_konversi() di SQL (di sana hanya kbTotal yang
 * dikembalikan; kkTotal disertakan di sini untuk kebutuhan tampilan).
 *
 * Contoh teruji: RG 27 -> kkTotal 9 -> kbTotal 3.
 */
export function rincianKonversi(
  rg: number | null | undefined,
  kk: number | null | undefined,
  kb: number | null | undefined,
): RincianKonversi {
  const rgBersih = bersihkanJumlah(rg);
  const kkBersih = bersihkanJumlah(kk);
  const kbBersih = bersihkanJumlah(kb);
  const kkTotal = kkBersih + Math.floor(rgBersih / 3);
  const kbTotal = kbBersih + Math.floor(kkTotal / 3);
  return { kkTotal, kbTotal };
}

/** KB hasil konversi bertahap. Cermin persis public.kb_konversi(). */
export function kbKonversi(
  rg: number | null | undefined,
  kk: number | null | undefined,
  kb: number | null | undefined,
): number {
  return rincianKonversi(rg, kk, kb).kbTotal;
}

/**
 * Nilai setoran Buku Hafalan: 'L' (Lancar) atau 'U' (Ulang).
 * Cermin persis public.nilai_setoran().
 *   BR/TS : L hanya bila RG, KK, KB semuanya 0 (mentah, bukan konversi).
 *   LM/BC : L bila KB hasil konversi <= 3.
 */
export function nilaiSetoran(
  jenis: JenisSetoran,
  rg: number | null | undefined,
  kk: number | null | undefined,
  kb: number | null | undefined,
): NilaiSetoran {
  if (jenis === "BR" || jenis === "TS") {
    return bersihkanJumlah(rg) === 0 &&
      bersihkanJumlah(kk) === 0 &&
      bersihkanJumlah(kb) === 0
      ? "L"
      : "U";
  }
  // LM dan BC (BC sementara mengikuti LM, menunggu konfirmasi user).
  return kbKonversi(rg, kk, kb) <= 3 ? "L" : "U";
}

/**
 * Hasil tes semester hifzh per juz dari KB hasil konversi.
 * Cermin persis public.hasil_ujian().
 */
export function hasilUjian(
  rg: number | null | undefined,
  kk: number | null | undefined,
  kb: number | null | undefined,
): HasilUjian {
  const kbTotal = kbKonversi(rg, kk, kb);
  if (kbTotal === 0) return "M";
  if (kbTotal <= 2) return "BS";
  if (kbTotal <= 4) return "B";
  if (kbTotal <= 7) return "C";
  if (kbTotal <= 10) return "K";
  return "G";
}
