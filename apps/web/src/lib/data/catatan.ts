/**
 * Lapisan data — CATATAN MUSYRIF (Jalur E, Tahap 2).
 *
 * POLA WAJIB tahap ini (data contoh):
 * - Bila env Supabase BELUM terisi, semua fungsi memakai DATA CONTOH FIKSI
 *   yang didefinisikan di file ini sendiri (disimpan sementara di memori;
 *   hilang saat muat ulang penuh) dan mengembalikan `sumberContoh: true`.
 * - Bila env terisi, fungsi memakai tabel `catatan_musyrif` lewat klien
 *   Supabase (src/lib/supabase/client.ts); akses tetap dibatasi RLS.
 *
 * ATURAN KERAS modul ini (dari rancangan user, ditegakkan berlapis):
 * - Nama pelapor WAJIB terisi. Di sini pelapor SELALU diambil dari profil
 *   pengguna yang sedang login (ambilProfilPelapor) — bukan dari isian
 *   bebas — dan simpanCatatan() MENOLAK menyimpan bila nama pelapor
 *   kosong. Di database, kolom pelapor_id & pelapor_nama juga NOT NULL
 *   dan pelapor_nama diisi pemicu dari akun login (0003_rls.sql).
 * - Semua pengajar hifzh, pengajar diniyyah, dan musyrif boleh memberi
 *   catatan; kategori: akhlaq, adab, ibadah_shalat, lainnya
 *   (enum kategori_catatan di 0001_schema.sql).
 *
 * Halaman TIDAK boleh mengakses tabel / gudang contoh secara langsung;
 * selalu lewat fungsi di file ini.
 */
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung, type HasilSantri } from "@/lib/data/santri";
import { SANTRI_CONTOH } from "@/lib/contoh/santri-contoh";
import type { PeranDb } from "@/lib/data/kehadiran";

/* ------------------------------------------------------------------ */
/* Kategori catatan                                                     */
/* ------------------------------------------------------------------ */

export type KategoriCatatan = "akhlaq" | "adab" | "ibadah_shalat" | "lainnya";

export const KATEGORI_CATATAN: KategoriCatatan[] = [
  "akhlaq",
  "adab",
  "ibadah_shalat",
  "lainnya",
];

export const LABEL_KATEGORI: Record<KategoriCatatan, string> = {
  akhlaq: "Akhlaq",
  adab: "Adab",
  ibadah_shalat: "Ibadah Shalat",
  lainnya: "Lainnya",
};

/* ------------------------------------------------------------------ */
/* Tipe data                                                            */
/* ------------------------------------------------------------------ */

export interface CatatanMusyrif {
  id: string;
  santriId: string;
  santriNama: string;
  pelaporId: string;
  /** Nama pelapor — selalu tampil, selalu dari akun login. */
  pelaporNama: string;
  kategori: KategoriCatatan;
  isi: string;
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
}

/** Profil pengguna yang sedang masuk — sumber nama pelapor. */
export interface ProfilPelapor {
  id: string;
  nama: string;
  peran: PeranDb;
}

/**
 * Profil CONTOH (fiktif) selama env Supabase belum terisi: seorang
 * musyrif contoh. Ini BUKAN login asli — setelah Supabase Auth aktif,
 * nama & peran dibaca dari tabel profiles berdasarkan auth.uid().
 */
export const PROFIL_PELAPOR_CONTOH: ProfilPelapor = {
  id: "profil-contoh-musyrif",
  nama: "Ustadz Rizki Ramadhan (contoh)",
  peran: "musyrif",
};

/* ------------------------------------------------------------------ */
/* Profil pelapor (pengguna yang sedang masuk)                          */
/* ------------------------------------------------------------------ */

/**
 * Profil pengguna saat ini. Nama dari profil inilah yang menjadi nama
 * pelapor pada setiap catatan baru — terkunci, tidak bisa diganti nama
 * orang lain dari halaman.
 */
export async function ambilProfilPelapor(): Promise<
  HasilSantri<ProfilPelapor>
> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: profil musyrif fiksi.
    return { data: PROFIL_PELAPOR_CONTOH, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const {
    data: { user },
    error: galatSesi,
  } = await supabase.auth.getUser();
  if (galatSesi || !user) {
    throw new Error("Belum ada sesi login yang aktif.");
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nama, peran")
    .eq("id", user.id)
    .single();
  if (error) {
    throw new Error(`Gagal membaca profil pengguna: ${error.message}`);
  }
  const baris = data as { id: string; nama: string; peran: PeranDb };
  return {
    data: { id: baris.id, nama: baris.nama, peran: baris.peran },
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* DATA CONTOH FIKSI (hanya mode contoh; id santri mengikuti             */
/* src/lib/contoh/santri-contoh.ts agar konsisten antar modul)          */
/* ------------------------------------------------------------------ */

let penomoranContoh = 100;
function idContohBaru(): string {
  penomoranContoh += 1;
  return `contoh-catatan-${penomoranContoh}`;
}

function namaSantriContoh(santriId: string): string {
  return SANTRI_CONTOH.find((s) => s.id === santriId)?.nama ?? santriId;
}

const gudangCatatanContoh: CatatanMusyrif[] = [
  {
    id: "contoh-catatan-1",
    santriId: "d0000000-0000-4000-8000-000000000002",
    santriNama: namaSantriContoh("d0000000-0000-4000-8000-000000000002"),
    pelaporId: "profil-contoh-musyrif",
    pelaporNama: "Ustadz Rizki Ramadhan (contoh)",
    kategori: "akhlaq",
    isi: "Menolong teman sekelas yang kesulitan membawa kitab tanpa diminta; patut dicontoh santri lain.",
    tanggal: "2026-11-01",
  },
  {
    id: "contoh-catatan-2",
    santriId: "d0000000-0000-4000-8000-000000000001",
    santriNama: namaSantriContoh("d0000000-0000-4000-8000-000000000001"),
    pelaporId: "profil-contoh-penyimak",
    pelaporNama: "Ustadz Muhammad Ridwan (contoh)",
    kategori: "ibadah_shalat",
    isi: "Konsisten shalat Subuh berjamaah dan hadir sebelum iqamah selama sepekan terakhir.",
    tanggal: "2026-11-02",
  },
  {
    id: "contoh-catatan-3",
    santriId: "d0000000-0000-4000-8000-000000000004",
    santriNama: namaSantriContoh("d0000000-0000-4000-8000-000000000004"),
    pelaporId: "profil-contoh-musyrif",
    pelaporNama: "Ustadz Rizki Ramadhan (contoh)",
    kategori: "adab",
    isi: "Perlu diingatkan kembali soal adab berbicara kepada yang lebih tua; sudah dibina secara pribadi.",
    tanggal: "2026-10-31",
  },
  {
    id: "contoh-catatan-4",
    santriId: "d0000000-0000-4000-8000-000000000005",
    santriNama: namaSantriContoh("d0000000-0000-4000-8000-000000000005"),
    pelaporId: "profil-contoh-musyrif",
    pelaporNama: "Ustadz Rizki Ramadhan (contoh)",
    kategori: "lainnya",
    isi: "Sempat kurang enak badan dua hari; sudah diperiksakan dan sekarang membaik.",
    tanggal: "2026-10-30",
  },
];

/* ------------------------------------------------------------------ */
/* Membaca catatan                                                      */
/* ------------------------------------------------------------------ */

interface BarisCatatanDb {
  id: string;
  santri_id: string;
  pelapor_id: string;
  pelapor_nama: string;
  kategori: KategoriCatatan;
  isi: string;
  tanggal: string;
  santri: { nama: string } | null;
}

const PILIHAN_CATATAN =
  "id, santri_id, pelapor_id, pelapor_nama, kategori, isi, tanggal, santri:santri_id ( nama )";

function barisDbKeCatatan(b: BarisCatatanDb): CatatanMusyrif {
  return {
    id: b.id,
    santriId: b.santri_id,
    santriNama: b.santri?.nama ?? "",
    pelaporId: b.pelapor_id,
    pelaporNama: b.pelapor_nama,
    kategori: b.kategori,
    isi: b.isi,
    tanggal: b.tanggal,
  };
}

function urutTerbaru(a: CatatanMusyrif, b: CatatanMusyrif): number {
  return b.tanggal.localeCompare(a.tanggal);
}

/** Catatan terbaru lintas santri (untuk daftar di halaman Catatan). */
export async function ambilCatatanTerbaru(
  batas = 20,
): Promise<HasilSantri<CatatanMusyrif[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: dari gudang contoh di memori, terbaru lebih dulu.
    const data = [...gudangCatatanContoh]
      .sort(urutTerbaru)
      .slice(0, batas);
    return { data, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("catatan_musyrif")
    .select(PILIHAN_CATATAN)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(batas);
  if (error) {
    throw new Error(`Gagal membaca catatan musyrif: ${error.message}`);
  }
  return {
    data: (data as unknown as BarisCatatanDb[]).map(barisDbKeCatatan),
    sumberContoh: false,
  };
}

/** Semua catatan untuk satu santri, terbaru lebih dulu. */
export async function ambilCatatanSantri(
  santriId: string,
): Promise<HasilSantri<CatatanMusyrif[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: saring gudang contoh di memori.
    const data = gudangCatatanContoh
      .filter((c) => c.santriId === santriId)
      .sort(urutTerbaru);
    return { data, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("catatan_musyrif")
    .select(PILIHAN_CATATAN)
    .eq("santri_id", santriId)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Gagal membaca catatan santri: ${error.message}`);
  }
  return {
    data: (data as unknown as BarisCatatanDb[]).map(barisDbKeCatatan),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Menyimpan catatan                                                    */
/* ------------------------------------------------------------------ */

export interface CatatanBaru {
  santriId: string;
  kategori: KategoriCatatan;
  isi: string;
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
}

/**
 * Simpan catatan baru. Nama pelapor TIDAK diterima dari pemanggil —
 * selalu diambil dari profil pengguna yang sedang login
 * (ambilProfilPelapor), dan penyimpanan DITOLAK bila nama itu kosong.
 * Di database, pelapor_nama juga diisi ulang oleh pemicu dari akun
 * login, jadi tidak ada jalan menulis atas nama orang lain.
 */
export async function simpanCatatan(
  masukan: CatatanBaru,
): Promise<HasilSantri<CatatanMusyrif>> {
  if (!masukan.isi.trim()) {
    throw new Error("Isi catatan wajib diisi.");
  }
  const profilHasil = await ambilProfilPelapor();
  const profil = profilHasil.data;
  if (!profil.nama.trim()) {
    throw new Error(
      "Nama pelapor wajib terisi dari akun yang masuk; catatan tidak disimpan.",
    );
  }

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori (hilang saat muat ulang).
    const baris: CatatanMusyrif = {
      id: idContohBaru(),
      santriId: masukan.santriId,
      santriNama: namaSantriContoh(masukan.santriId),
      pelaporId: profil.id,
      pelaporNama: profil.nama,
      kategori: masukan.kategori,
      isi: masukan.isi.trim(),
      tanggal: masukan.tanggal,
    };
    gudangCatatanContoh.unshift(baris);
    return { data: baris, sumberContoh: true };
  }

  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("catatan_musyrif")
    .insert({
      santri_id: masukan.santriId,
      pelapor_id: profil.id,
      pelapor_nama: profil.nama,
      kategori: masukan.kategori,
      isi: masukan.isi.trim(),
      tanggal: masukan.tanggal,
    })
    .select(PILIHAN_CATATAN)
    .single();
  if (error) {
    throw new Error(`Gagal menyimpan catatan: ${error.message}`);
  }
  return {
    data: barisDbKeCatatan(data as unknown as BarisCatatanDb),
    sumberContoh: false,
  };
}
