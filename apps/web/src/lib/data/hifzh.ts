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
 * - Kegagalan baca produksi menghasilkan galat; data contoh hanya digunakan
 *   saat konfigurasi backend memang belum tersedia.
 *
 * File ini TIDAK memakai src/lib/contoh/ (milik jalur lain).
 */

import { semuaBaris } from "@/lib/data/halaman";
import { ambilSemesterAdmin } from "@/lib/data/admin";
import { tanggalIsoHariIni } from "@/lib/tanggal";
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
  /** Id akun penyimak (untuk gerbang aksi ubah/hapus: pemilik atau admin). */
  penyimakId: string | null;
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
  semesterId?: string;
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
  data?: BarisUjianHifzh;
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
   DATA CONTOH FIKTIF (hanya dipakai bila env belum terisi)
   ===================================================================== */

const SANTRI_CONTOH: SantriRingkas[] = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    nama: "Fulan Alif (Contoh)",
    kelasTingkat: 1,
  },
  {
    id: "d0000000-0000-4000-8000-000000000002",
    nama: "Fulan Bima (Contoh)",
    kelasTingkat: 1,
  },
  {
    id: "d0000000-0000-4000-8000-000000000003",
    nama: "Fulan Candra (Contoh)",
    kelasTingkat: 2,
  },
  {
    id: "d0000000-0000-4000-8000-000000000004",
    nama: "Fulan Danu (Contoh)",
    kelasTingkat: 2,
  },
  {
    id: "d0000000-0000-4000-8000-000000000005",
    nama: "Fulan Eko (Contoh)",
    kelasTingkat: 3,
  },
  {
    id: "d0000000-0000-4000-8000-000000000006",
    nama: "Fulan Fajar (Contoh)",
    kelasTingkat: 3,
  },
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
    penyimakId: null,
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
    penyimakId: null,
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
    penyimakId: null,
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
    penyimakId: null,
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
    catatanRincian:
      "Ayat 7–9: empat lafazh tidak terbaca setelah diingatkan 3x.",
    nilaiHuruf: "U",
    penyimakId: null,
    penyimakNama: NAMA_PENYIMAK_CONTOH,
    tugasBerikutnya: "Ulangi Al-Jatsiyah ayat 1–13",
  },
];

// Nilai contoh harus selalu cocok dengan fungsi resmi.
for (const s of SETORAN_CONTOH) {
  s.nilaiHuruf = nilaiSetoran(s.jenis, s.rg, s.kk, s.kb);
}

const UJIAN_CONTOH: BarisUjianHifzh[] = [
  {
    id: "contoh-ujian-1",
    santriId: "d0000000-0000-4000-8000-000000000001",
    juz: 1,
    halaman: 20,
    rg: 0,
    kk: 0,
    kb: 0,
    hasil: "M",
  },
  {
    id: "contoh-ujian-2",
    santriId: "d0000000-0000-4000-8000-000000000001",
    juz: 2,
    halaman: 21,
    rg: 9,
    kk: 0,
    kb: 0,
    hasil: "BS",
  },
  {
    id: "contoh-ujian-3",
    santriId: "d0000000-0000-4000-8000-000000000001",
    juz: 3,
    halaman: 20,
    rg: 27,
    kk: 0,
    kb: 0,
    hasil: "B",
  },
  {
    id: "contoh-ujian-4",
    santriId: "d0000000-0000-4000-8000-000000000003",
    juz: 1,
    halaman: 20,
    rg: 0,
    kk: 0,
    kb: 2,
    hasil: "BS",
  },
  {
    id: "contoh-ujian-5",
    santriId: "d0000000-0000-4000-8000-000000000003",
    juz: 2,
    halaman: 21,
    rg: 0,
    kk: 3,
    kb: 5,
    hasil: "C",
  },
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
    const data = await semuaBaris<Record<string, unknown>>(() =>
      supabase
        .from("santri")
        .select("id,nama,kelas:kelas_id(tingkat)", { count: "exact" })
        .eq("status_aktif", true)
        .order("nama")
        .order("id"),
    );
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
  } catch {
    throw new Error(
      "Data Hifzh belum dapat dimuat. Periksa koneksi atau masuk kembali, lalu coba lagi.",
    );
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
        "id, santri_id, penyimak_id, tanggal_masehi, tanggal_hijriah, jenis, halaman, surat, ayat_dari, ayat_sampai, rg, kk, kb, catatan_rincian, nilai_huruf, tugas_berikutnya, santri:santri_id ( nama ), penyimak:penyimak_id ( nama )",
      )
      .order("tanggal_masehi", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(batas);
    if (error) throw error;
    const baris = (data ?? []) as unknown as Array<Record<string, unknown>>;
    return { sumber: "supabase", data: baris.map(petakanSetoran) };
  } catch {
    throw new Error(
      "Data Hifzh belum dapat dimuat. Periksa koneksi atau masuk kembali, lalu coba lagi.",
    );
  }
}

/**
 * Riwayat setoran KHUSUS satu santri, terbaru lebih dulu, dibatasi
 * `batas` baris. Dipakai halaman detail santri (audit Fase 1): halaman
 * TIDAK lagi mengambil setoran terakhir lintas santri lalu menyaring,
 * karena setoran anak bisa tidak muncul bila tidak termasuk potongan
 * lintas santri tersebut.
 */
export async function ambilSetoranSantri(
  santriId: string,
  batas = 50,
): Promise<HasilMuat<SetoranHifzh[]>> {
  if (!envSupabaseTerisi()) {
    return {
      sumber: "contoh",
      data: SETORAN_CONTOH.filter((s) => s.santriId === santriId).slice(
        0,
        batas,
      ),
    };
  }
  try {
    const supabase = buatKlienBrowser();
    const { data, error } = await supabase
      .from("hifzh_setoran")
      .select(
        "id, santri_id, penyimak_id, tanggal_masehi, tanggal_hijriah, jenis, halaman, surat, ayat_dari, ayat_sampai, rg, kk, kb, catatan_rincian, nilai_huruf, tugas_berikutnya, santri:santri_id ( nama ), penyimak:penyimak_id ( nama )",
      )
      .eq("santri_id", santriId)
      .order("tanggal_masehi", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(batas);
    if (error) throw error;
    const baris = (data ?? []) as unknown as Array<Record<string, unknown>>;
    return { sumber: "supabase", data: baris.map(petakanSetoran) };
  } catch {
    throw new Error(
      "Data Hifzh belum dapat dimuat. Periksa koneksi atau masuk kembali, lalu coba lagi.",
    );
  }
}

/** Baris tes semester (per juz) untuk satu santri. */
export async function ambilUjianSemester(
  santriId: string,
  semesterId?: string,
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
    if (!semesterId) {
      const daftar = await ambilSemesterAdmin();
      const hari = tanggalIsoHariIni();
      semesterId = daftar.data.find(
        (x) => x.tanggalMulai <= hari && x.tanggalSelesai >= hari,
      )?.id;
      if (!semesterId) return { sumber: "supabase", data: [] };
    }
    const { data, error } = await supabase
      .from("hifzh_ujian")
      .select("id, santri_id, semester_id, juz, halaman, rg, kk, kb, hasil")
      .eq("santri_id", santriId)
      .eq("semester_id", semesterId)
      .order("juz", { ascending: true });
    if (error) throw error;
    const baris = (data ?? []) as unknown as Array<Record<string, unknown>>;
    return { sumber: "supabase", data: baris.map(petakanUjian) };
  } catch {
    throw new Error(
      "Data Hifzh belum dapat dimuat. Periksa koneksi atau masuk kembali, lalu coba lagi.",
    );
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

/** Masukan ubah setoran — santri & penyimak TIDAK ikut diubah. */
export type MasukanUbahSetoran = Omit<SetoranBaru, "santriId">;

/**
 * Ubah satu setoran tersimpan (koreksi oleh penyimak pemilik entri
 * atau Admin Utama — ditegakkan policy setoran_ubah di database:
 * admin ATAU penyimak_id = akun login). nilai_huruf dihitung ulang
 * pemicu database dari RG/KK/KB baru. Mode contoh mengubah gudang
 * contoh di memori bila entrinya ada di sana.
 */
export async function ubahSetoran(
  id: string,
  masukan: MasukanUbahSetoran,
): Promise<HasilSimpan> {
  if (!envSupabaseTerisi()) {
    const lama = SETORAN_CONTOH.find((s) => s.id === id);
    if (lama) {
      Object.assign(lama, masukan);
      lama.nilaiHuruf = nilaiSetoran(lama.jenis, lama.rg, lama.kk, lama.kb);
    }
    return { sumber: "contoh", tersimpanKeDatabase: false };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("hifzh_setoran")
    .update({
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
      tugas_berikutnya: masukan.tugasBerikutnya,
    })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      "Setoran tidak ditemukan, atau Anda tidak berhak mengubahnya (hanya penyimak pemilik entri atau Admin Utama).",
    );
  }
  return { sumber: "supabase", tersimpanKeDatabase: true };
}

/**
 * Hapus satu setoran tersimpan (policy setoran_hapus: admin ATAU
 * penyimak pemilik entri). Mode contoh menghapus dari gudang contoh
 * di memori bila entrinya ada di sana.
 */
export async function hapusSetoran(id: string): Promise<HasilSimpan> {
  if (!envSupabaseTerisi()) {
    const indeks = SETORAN_CONTOH.findIndex((s) => s.id === id);
    if (indeks >= 0) SETORAN_CONTOH.splice(indeks, 1);
    return { sumber: "contoh", tersimpanKeDatabase: false };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("hifzh_setoran")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      "Setoran tidak ditemukan, atau Anda tidak berhak menghapusnya (hanya penyimak pemilik entri atau Admin Utama).",
    );
  }
  return { sumber: "supabase", tersimpanKeDatabase: true };
}

/** Simpan nilai pada semester yang dipilih, memakai ID server ketika memperbarui. */
export async function simpanBarisUjian(
  masukan: BarisUjianBaru,
  semesterId?: string,
  id?: string,
): Promise<HasilSimpan> {
  if (!semesterId) throw new Error("Pilih semester ujian terlebih dahulu.");
  if (
    !Number.isInteger(masukan.juz) ||
    masukan.juz < 1 ||
    masukan.juz > 30 ||
    !Number.isInteger(masukan.halaman) ||
    masukan.halaman < 1 ||
    [masukan.rg, masukan.kk, masukan.kb].some(
      (x) => !Number.isInteger(x) || x < 0,
    )
  )
    throw new Error("Periksa juz, halaman, dan jumlah kesalahan.");
  if (!envSupabaseTerisi())
    return { sumber: "contoh", tersimpanKeDatabase: false };
  const db = buatKlienBrowser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Masuk kembali sebelum menyimpan ujian.");
  const nilai = {
    juz: masukan.juz,
    halaman: masukan.halaman,
    rg: masukan.rg,
    kk: masukan.kk,
    kb: masukan.kb,
  };
  const q = id
    ? db
        .from("hifzh_ujian")
        .update(nilai)
        .eq("id", id)
        .eq("santri_id", masukan.santriId)
        .eq("semester_id", semesterId)
    : db
        .from("hifzh_ujian")
        .insert({
          ...nilai,
          santri_id: masukan.santriId,
          semester_id: semesterId,
          penguji_id: user.id,
        });
  const { data, error } = await q
    .select("id,santri_id,semester_id,juz,halaman,rg,kk,kb,hasil")
    .single();
  if (error)
    throw new Error(
      error.code === "23505"
        ? "Juz ini baru saja diisi. Muat ulang sebelum memperbarui."
        : "Ujian belum tersimpan. Periksa akses penguji dan muat ulang sebelum mencoba lagi.",
    );
  return {
    sumber: "supabase",
    tersimpanKeDatabase: true,
    data: petakanUjian(data),
  };
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
    penyimakId: (baris.penyimak_id as string | null) ?? null,
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
    semesterId: String(baris.semester_id ?? ""),
    juz: Number(baris.juz ?? 0),
    halaman: Number(baris.halaman ?? 0),
    rg,
    kk,
    kb,
    hasil: (baris.hasil as HasilUjian | null) ?? hasilUjian(rg, kk, kb),
  };
}
