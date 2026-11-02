/**
 * Lapisan data modul Hifzh (setoran Buku Hafalan & tes semester).
 *
 * MODE DATA — baca baik-baik:
 * - Bila env NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUDAH terisi, fungsi di sini membaca/menulis tabel hifzh_setoran &
 *   hifzh_ujian lewat klien Supabase (akses tetap dibatasi RLS).
 * - Bila env BELUM terisi (keadaan Tahap 2, proyek Supabase dibuat di
 *   Tahap 3), semua fungsi mengembalikan DATA CONTOH FIKTIF yang
 *   didefinisikan di file ini sendiri. Nama santri, penyimak, tanggal,
 *   dan nilai di bawah ini BUKAN data nyata.
 * - Setiap fungsi mengembalikan bendera `sumber` ("supabase" | "contoh")
 *   supaya halaman bisa menampilkan penanda sumber datanya dengan jujur.
 * - Bila kueri Supabase gagal (mis. migrasi belum dijalankan), fungsi
 *   baca jatuh kembali ke data contoh dan mencatat peringatan di konsol,
 *   agar halaman tetap bisa ditinjau selama masa pembangunan bertahap.
 *
 * File ini TIDAK memakai src/lib/contoh/ (milik jalur lain).
 */

import { buatKlienBrowser } from "@/lib/supabase/client";
import {
  hasilUjian,
  nilaiSetoran,
  type HasilUjian,
  type JenisSetoran,
  type NilaiSetoran,
} from "@/lib/hifzh";

export type SumberData = "supabase" | "contoh";

export interface HasilMuat<T> {
  sumber: SumberData;
  data: T;
}

/** Ringkasan santri untuk pilihan pada formulir. */
export interface SantriRingkas {
  id: string;
  nama: string;
  /** Tingkat kelas 1/2/3 bila diketahui. */
  kelasTingkat: number | null;
}

/** Satu baris setoran Buku Hafalan (cermin tabel hifzh_setoran). */
export interface SetoranHifzh {
  id: string;
  santriId: string;
  santriNama: string;
  tanggalMasehi: string; // format ISO: YYYY-MM-DD
  tanggalHijriah: string;
  jenis: JenisSetoran;
  halaman: number;
  surat: string;
  ayatDari: number;
  ayatSampai: number;
  rg: number;
  kk: number;
  kb: number;
  catatanRincian: string | null;
  nilaiHuruf: NilaiSetoran;
  penyimakNama: string;
  tugasBerikutnya: string | null;
}

/** Masukan form setoran (nilai & paraf dihitung/dikunci, bukan dari form). */
export interface SetoranBaru {
  santriId: string;
  tanggalMasehi: string;
  tanggalHijriah: string;
  jenis: JenisSetoran;
  halaman: number;
  surat: string;
  ayatDari: number;
  ayatSampai: number;
  rg: number;
  kk: number;
  kb: number;
  catatanRincian: string | null;
  tugasBerikutnya: string | null;
}

/** Satu baris tes semester per juz (cermin tabel hifzh_ujian). */
export interface BarisUjianHifzh {
  id: string;
  santriId: string;
  juz: number;
  halaman: number;
  rg: number;
  kk: number;
  kb: number;
  hasil: HasilUjian;
}

/** Masukan form baris ujian (hasil dihitung otomatis). */
export interface BarisUjianBaru {
  santriId: string;
  juz: number;
  halaman: number;
  rg: number;
  kk: number;
  kb: number;
}

export interface HasilSimpan {
  sumber: SumberData;
  /** true hanya bila benar-benar tertulis ke database Supabase. */
  tersimpanKeDatabase: boolean;
}

/** Nama penyimak pada data contoh & paraf terkunci mode contoh. */
export const NAMA_PENYIMAK_CONTOH = "Ustadz Muhammad Ridwan (contoh)";

/** Apakah env Supabase sudah terisi? */
export function envSupabaseTerisi(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/* =====================================================================
   DATA CONTOH FIKTIF (hanya dipakai bila env belum terisi / kueri gagal)
   ===================================================================== */

const SANTRI_CONTOH: SantriRingkas[] = [
  { id: "d0000000-0000-4000-8000-000000000001", nama: "Fulan Alif (Contoh)", kelasTingkat: 1 },
  { id: "d0000000-0000-4000-8000-000000000002", nama: "Fulan Bima (Contoh)", kelasTingkat: 1 },
  { id: "d0000000-0000-4000-8000-000000000003", nama: "Fulan Candra (Contoh)", kelasTingkat: 2 },
  { id: "d0000000-0000-4000-8000-000000000004", nama: "Fulan Danu (Contoh)", kelasTingkat: 2 },
  { id: "d0000000-0000-4000-8000-000000000005", nama: "Fulan Eko (Contoh)", kelasTingkat: 3 },
  { id: "d0000000-0000-4000-8000-000000000006", nama: "Fulan Fajar (Contoh)", kelasTingkat: 3 },
];

const SETORAN_CONTOH: SetoranHifzh[] = [
  {
    id: "contoh-setoran-1",
    santriId: "d0000000-0000-4000-8000-000000000001",
    santriNama: "Fulan Alif (Contoh)",
    tanggalMasehi: "2026-11-02",
    tanggalHijriah: "23 Jumadilawal 1448 H",
    jenis: "BR",
    halaman: 214,
    surat: "Al-Kahf",
    ayatDari: 1,
    ayatSampai: 8,
    rg: 0,
    kk: 0,
    kb: 0,
    catatanRincian: null,
    nilaiHuruf: "L",
    penyimakNama: NAMA_PENYIMAK_CONTOH,
    tugasBerikutnya: "Al-Kahf ayat 9–16",
  },
  {
    id: "contoh-setoran-2",
    santriId: "d0000000-0000-4000-8000-000000000003",
    santriNama: "Fulan Candra (Contoh)",
    tanggalMasehi: "2026-11-02",
    tanggalHijriah: "23 Jumadilawal 1448 H",
    jenis: "LM",
    halaman: 302,
    surat: "Maryam",
    ayatDari: 41,
    ayatSampai: 55,
    rg: 5,
    kk: 1,
    kb: 0,
    catatanRincian: "Ayat 47: lafazh terragukan di tengah ayat.",
    nilaiHuruf: "L",
    penyimakNama: NAMA_PENYIMAK_CONTOH,
    tugasBerikutnya: "Maryam ayat 56–70",
  },
  {
    id: "contoh-setoran-3",
    santriId: "d0000000-0000-4000-8000-000000000005",
    santriNama: "Fulan Eko (Contoh)",
    tanggalMasehi: "2026-11-01",
    tanggalHijriah: "22 Jumadilawal 1448 H",
    jenis: "TS",
    halaman: 421,
    surat: "Al-Ahzab",
    ayatDari: 1,
    ayatSampai: 10,
    rg: 0,
    kk: 1,
    kb: 0,
    catatanRincian: "Ayat 6: berhenti tidak pada tempatnya 2x.",
    nilaiHuruf: "U",
    penyimakNama: NAMA_PENYIMAK_CONTOH,
    tugasBerikutnya: "Ulangi Al-Ahzab ayat 1–10",
  },
  {
    id: "contoh-setoran-4",
    santriId: "d0000000-0000-4000-8000-000000000002",
    santriNama: "Fulan Bima (Contoh)",
    tanggalMasehi: "2026-11-01",
    tanggalHijriah: "22 Jumadilawal 1448 H",
    jenis: "BC",
    halaman: 85,
    surat: "Al-Anfal",
    ayatDari: 20,
    ayatSampai: 28,
    rg: 2,
    kk: 0,
    kb: 0,
    catatanRincian: null,
    nilaiHuruf: "L",
    penyimakNama: NAMA_PENYIMAK_CONTOH,
    tugasBerikutnya: "Hafalkan Al-Anfal ayat 20–28",
  },
  {
    id: "contoh-setoran-5",
    santriId: "d0000000-0000-4000-8000-000000000004",
    santriNama: "Fulan Danu (Contoh)",
    tanggalMasehi: "2026-10-31",
    tanggalHijriah: "21 Jumadilawal 1448 H",
    jenis: "LM",
    halaman: 560,
    surat: "Al-Jatsiyah",
    ayatDari: 1,
    ayatSampai: 13,
    rg: 0,
    kk: 0,
    kb: 4,
    catatanRincian: "Ayat 7–9: empat lafazh tidak terbaca setelah diingatkan 3x.",
    nilaiHuruf: "U",
    penyimakNama: NAMA_PENYIMAK_CONTOH,
    tugasBerikutnya: "Ulangi Al-Jatsiyah ayat 1–13",
  },
];

// Nilai contoh harus selalu cocok dengan fungsi resmi.
for (const s of SETORAN_CONTOH) {
  s.nilaiHuruf = nilaiSetoran(s.jenis, s.rg, s.kk, s.kb);
}

const UJIAN_CONTOH: BarisUjianHifzh[] = [
  { id: "contoh-ujian-1", santriId: "d0000000-0000-4000-8000-000000000001", juz: 1, halaman: 20, rg: 0, kk: 0, kb: 0, hasil: "M" },
  { id: "contoh-ujian-2", santriId: "d0000000-0000-4000-8000-000000000001", juz: 2, halaman: 21, rg: 9, kk: 0, kb: 0, hasil: "BS" },
  { id: "contoh-ujian-3", santriId: "d0000000-0000-4000-8000-000000000001", juz: 3, halaman: 20, rg: 27, kk: 0, kb: 0, hasil: "B" },
  { id: "contoh-ujian-4", santriId: "d0000000-0000-4000-8000-000000000003", juz: 1, halaman: 20, rg: 0, kk: 0, kb: 2, hasil: "BS" },
  { id: "contoh-ujian-5", santriId: "d0000000-0000-4000-8000-000000000003", juz: 2, halaman: 21, rg: 0, kk: 3, kb: 5, hasil: "C" },
];

// Hasil contoh harus selalu cocok dengan fungsi resmi.
for (const u of UJIAN_CONTOH) {
  u.hasil = hasilUjian(u.rg, u.kk, u.kb);
}

/* =====================================================================
   FUNGSI BACA
   ===================================================================== */

/** Daftar santri untuk pilihan formulir (ringkas). */
export async function ambilDaftarSantri(): Promise<HasilMuat<SantriRingkas[]>> {
  if (!envSupabaseTerisi()) {
    return { sumber: "contoh", data: SANTRI_CONTOH };
  }
  try {
    const supabase = buatKlienBrowser();
    const { data, error } = await supabase
      .from("santri")
      .select("id, nama, kelas:kelas_id ( tingkat )")
      .eq("status_aktif", true)
      .order("nama", { ascending: true });
    if (error) throw error;
    const baris = (data ?? []) as unknown as Array<{
      id: string;
      nama: string;
      kelas: { tingkat: number } | null;
    }>;
    return {
      sumber: "supabase",
      data: baris.map((b) => ({
        id: b.id,
        nama: b.nama,
        kelasTingkat: b.kelas?.tingkat ?? null,
      })),
    };
  } catch (ralat) {
    console.warn("[hifzh] Gagal membaca daftar santri, memakai data contoh:", ralat);
    return { sumber: "contoh", data: SANTRI_CONTOH };
  }
}

/** Setoran terakhir (lintas santri), terbaru lebih dulu. */
export async function ambilSetoranTerakhir(
  batas = 10,
): Promise<HasilMuat<SetoranHifzh[]>> {
  if (!envSupabaseTerisi()) {
    return { sumber: "contoh", data: SETORAN_CONTOH.slice(0, batas) };
  }
  try {
    const supabase = buatKlienBrowser();
    const { data, error } = await supabase
      .from("hifzh_setoran")
      .select(
        "id, santri_id, tanggal_masehi, tanggal_hijriah, jenis, halaman, surat, ayat_dari, ayat_sampai, rg, kk, kb, catatan_rincian, nilai_huruf, tugas_berikutnya, santri:santri_id ( nama ), penyimak:penyimak_id ( nama )",
      )
      .order("tanggal_masehi", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(batas);
    if (error) throw error;
    const baris = (data ?? []) as unknown as Array<Record<string, unknown>>;
    return { sumber: "supabase", data: baris.map(petakanSetoran) };
  } catch (ralat) {
    console.warn("[hifzh] Gagal membaca setoran, memakai data contoh:", ralat);
    return { sumber: "contoh", data: SETORAN_CONTOH.slice(0, batas) };
  }
}

/** Baris tes semester (per juz) untuk satu santri. */
export async function ambilUjianSemester(
  santriId: string,
): Promise<HasilMuat<BarisUjianHifzh[]>> {
  if (!envSupabaseTerisi()) {
    return {
      sumber: "contoh",
      data: UJIAN_CONTOH.filter((u) => u.santriId === santriId).sort(
        (a, b) => a.juz - b.juz,
      ),
    };
  }
  try {
    const supabase = buatKlienBrowser();
    // CATATAN TAHAP 2: semester aktif belum ditentukan modul lain, jadi
    // sementara tampilkan baris dari semester terakhir yang ada untuk
    // santri ini. Penentuan semester aktif diputuskan di tahap integrasi.
    const { data, error } = await supabase
      .from("hifzh_ujian")
      .select("id, santri_id, juz, halaman, rg, kk, kb, hasil")
      .eq("santri_id", santriId)
      .order("juz", { ascending: true });
    if (error) throw error;
    const baris = (data ?? []) as unknown as Array<Record<string, unknown>>;
    return { sumber: "supabase", data: baris.map(petakanUjian) };
  } catch (ralat) {
    console.warn("[hifzh] Gagal membaca ujian, memakai data contoh:", ralat);
    return {
      sumber: "contoh",
      data: UJIAN_CONTOH.filter((u) => u.santriId === santriId),
    };
  }
}

/* =====================================================================
   FUNGSI TULIS
   ===================================================================== */

/**
 * Simpan setoran baru.
 * Mode contoh: TIDAK menulis apa pun (halaman menambahkan baris ke daftar
 * lokalnya sendiri) dan mengembalikan tersimpanKeDatabase = false.
 * Mode Supabase: penyimak_id diambil dari sesi login (auth.getUser),
 * nilai_huruf tidak dikirim karena diisi pemicu database.
 */
export async function simpanSetoran(
  masukan: SetoranBaru,
): Promise<HasilSimpan> {
  if (!envSupabaseTerisi()) {
    return { sumber: "contoh", tersimpanKeDatabase: false };
  }
  const supabase = buatKlienBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Sesi login tidak ditemukan; setoran tidak disimpan.");
  }
  const { error } = await supabase.from("hifzh_setoran").insert({
    santri_id: masukan.santriId,
    tanggal_masehi: masukan.tanggalMasehi,
    tanggal_hijriah: masukan.tanggalHijriah,
    jenis: masukan.jenis,
    halaman: masukan.halaman,
    surat: masukan.surat,
    ayat_dari: masukan.ayatDari,
    ayat_sampai: masukan.ayatSampai,
    rg: masukan.rg,
    kk: masukan.kk,
    kb: masukan.kb,
    catatan_rincian: masukan.catatanRincian,
    penyimak_id: user.id,
    tugas_berikutnya: masukan.tugasBerikutnya,
  });
  if (error) throw error;
  return { sumber: "supabase", tersimpanKeDatabase: true };
}

/**
 * Simpan baris ujian per juz.
 * Mode Supabase membutuhkan semester_id; penentuan semester aktif belum
 * diputuskan modul lain, jadi untuk sekarang fungsi ini hanya aktif di
 * mode contoh (baris ditambahkan halaman ke keadaan lokalnya). Lihat
 * catatan di ambilUjianSemester().
 */
export async function simpanBarisUjian(
  masukan: BarisUjianBaru,
  semesterId?: string,
): Promise<HasilSimpan> {
  if (!envSupabaseTerisi()) {
    return { sumber: "contoh", tersimpanKeDatabase: false };
  }
  if (!semesterId) {
    throw new Error(
      "Semester aktif belum ditentukan; baris ujian belum bisa disimpan ke database.",
    );
  }
  const supabase = buatKlienBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Sesi login tidak ditemukan; baris ujian tidak disimpan.");
  }
  const { error } = await supabase.from("hifzh_ujian").insert({
    santri_id: masukan.santriId,
    semester_id: semesterId,
    juz: masukan.juz,
    halaman: masukan.halaman,
    rg: masukan.rg,
    kk: masukan.kk,
    kb: masukan.kb,
    penguji_id: user.id,
  });
  if (error) throw error;
  return { sumber: "supabase", tersimpanKeDatabase: true };
}

/* =====================================================================
   PEMETAAN BARIS DATABASE -> TIPE ANTARMUKA
   ===================================================================== */

function ambilNamaTersarang(
  baris: Record<string, unknown>,
  kunci: string,
): string {
  const nilai = baris[kunci] as { nama?: unknown } | null | undefined;
  return typeof nilai?.nama === "string" ? nilai.nama : "";
}

function petakanSetoran(baris: Record<string, unknown>): SetoranHifzh {
  const jenis = String(baris.jenis) as JenisSetoran;
  const rg = Number(baris.rg ?? 0);
  const kk = Number(baris.kk ?? 0);
  const kb = Number(baris.kb ?? 0);
  return {
    id: String(baris.id),
    santriId: String(baris.santri_id),
    santriNama: ambilNamaTersarang(baris, "santri"),
    tanggalMasehi: String(baris.tanggal_masehi),
    tanggalHijriah: String(baris.tanggal_hijriah),
    jenis,
    halaman: Number(baris.halaman ?? 0),
    surat: String(baris.surat ?? ""),
    ayatDari: Number(baris.ayat_dari ?? 0),
    ayatSampai: Number(baris.ayat_sampai ?? 0),
    rg,
    kk,
    kb,
    catatanRincian: (baris.catatan_rincian as string | null) ?? null,
    // nilai_huruf diisi pemicu database; bila kosong, hitung di klien
    // dengan fungsi yang sama persis agar tampilan tidak pernah kosong.
    nilaiHuruf:
      (baris.nilai_huruf as NilaiSetoran | null) ??
      nilaiSetoran(jenis, rg, kk, kb),
    penyimakNama: ambilNamaTersarang(baris, "penyimak"),
    tugasBerikutnya: (baris.tugas_berikutnya as string | null) ?? null,
  };
}

function petakanUjian(baris: Record<string, unknown>): BarisUjianHifzh {
  const rg = Number(baris.rg ?? 0);
  const kk = Number(baris.kk ?? 0);
  const kb = Number(baris.kb ?? 0);
  return {
    id: String(baris.id),
    santriId: String(baris.santri_id),
    juz: Number(baris.juz ?? 0),
    halaman: Number(baris.halaman ?? 0),
    rg,
    kk,
    kb,
    hasil: (baris.hasil as HasilUjian | null) ?? hasilUjian(rg, kk, kb),
  };
}
