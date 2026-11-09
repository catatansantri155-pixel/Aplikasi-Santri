/**
 * Lapisan data — SANTRI & KELAS (Jalur C, Tahap 2).
 *
 * POLA WAJIB tahap ini (data contoh):
 * - Bila env Supabase (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *   BELUM terisi, semua fungsi di file ini mengembalikan DATA CONTOH FIKSI
 *   dari src/lib/contoh/ dan menandai hasilnya dengan `sumberContoh: true`,
 *   agar halaman tetap bisa dirender & diuji sebelum proyek Supabase dibuat
 *   (Tahap 3).
 * - Bila env terisi, fungsi membaca tabel asli lewat klien Supabase
 *   (src/lib/supabase/client.ts); aksesnya tetap dibatasi RLS di database —
 *   staf melihat semua santri, wali hanya anaknya sendiri.
 *
 * Halaman TIDAK boleh membaca tabel / data contoh secara langsung;
 * selalu lewat fungsi di file ini.
 */
import { semuaBaris } from "@/lib/data/halaman";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { KELAS_CONTOH, SANTRI_CONTOH } from "@/lib/contoh/santri-contoh";

/** True bila env Supabase belum terisi → aplikasi berjalan dalam mode contoh. */
export function supabaseTerhubung(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export interface KelasRingkasan {
  id: string;
  tingkat: number;
  nama: string;
}

export interface Santri {
  id: string;
  nama: string;
  namaAyahWali: string;
  kelasId: string;
  kelasTingkat: number;
  kelasNama: string;
  nis: string | null;
  statusAktif: boolean;
}

export interface HasilSantri<T> {
  data: T;
  /** True bila data berasal dari data contoh (env Supabase belum terisi). */
  sumberContoh: boolean;
}

function santriContohKeSantri(): Santri[] {
  return SANTRI_CONTOH.filter((s) => s.statusAktif).map((s) => {
    const kelas = KELAS_CONTOH.find((k) => k.id === s.kelasId);
    return {
      id: s.id,
      nama: s.nama,
      namaAyahWali: s.namaAyahWali,
      kelasId: s.kelasId,
      kelasTingkat: kelas?.tingkat ?? 0,
      kelasNama: kelas?.nama ?? "Tanpa Kelas",
      nis: s.nis,
      statusAktif: s.statusAktif,
    };
  });
}

interface BarisSantriDb {
  id: string;
  nama: string;
  nama_ayah_wali: string;
  kelas_id: string;
  nis: string | null;
  status_aktif: boolean;
  kelas: { id: string; tingkat: number; nama: string } | null;
}

function barisDbKeSantri(baris: BarisSantriDb): Santri {
  return {
    id: baris.id,
    nama: baris.nama,
    namaAyahWali: baris.nama_ayah_wali,
    kelasId: baris.kelas_id,
    kelasTingkat: baris.kelas?.tingkat ?? 0,
    kelasNama: baris.kelas?.nama ?? "Tanpa Kelas",
    nis: baris.nis,
    statusAktif: baris.status_aktif,
  };
}

const PILIHAN_SANTRI =
  "id, nama, nama_ayah_wali, kelas_id, nis, status_aktif, kelas:kelas_id ( id, tingkat, nama )";

/** Daftar semua santri aktif, terurut nama, lengkap dengan kelasnya. */
export async function ambilDaftarSantri(): Promise<HasilSantri<Santri[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: env Supabase belum terisi → data fiksi dari src/lib/contoh/.
    return { data: santriContohKeSantri(), sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const data = await semuaBaris<BarisSantriDb>(() =>
    supabase
      .from("santri")
      .select(PILIHAN_SANTRI, { count: "exact" })
      .eq("status_aktif", true)
      .order("nama")
      .order("id"),
  );
  return {
    data: (data as unknown as BarisSantriDb[]).map(barisDbKeSantri),
    sumberContoh: false,
  };
}

/** Daftar santri yang sudah dikelompokkan per tingkat kelas (1, 2, 3). */
export async function ambilSantriPerKelas(): Promise<
  HasilSantri<{ kelas: KelasRingkasan; santri: Santri[] }[]>
> {
  const hasil = await ambilDaftarSantri();
  const kelompok = new Map<
    number,
    { kelas: KelasRingkasan; santri: Santri[] }
  >();
  for (const s of hasil.data) {
    const kunci = s.kelasTingkat;
    if (!kelompok.has(kunci)) {
      kelompok.set(kunci, {
        kelas: { id: s.kelasId, tingkat: s.kelasTingkat, nama: s.kelasNama },
        santri: [],
      });
    }
    kelompok.get(kunci)?.santri.push(s);
  }
  return {
    data: [...kelompok.values()].sort(
      (a, b) => a.kelas.tingkat - b.kelas.tingkat,
    ),
    sumberContoh: hasil.sumberContoh,
  };
}

/** Detail satu santri; null bila tidak ditemukan / tidak boleh dilihat (RLS). */
export async function ambilDetailSantri(
  id: string,
): Promise<HasilSantri<Santri | null>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: cari di data fiksi.
    const ditemukan = santriContohKeSantri().find((s) => s.id === id) ?? null;
    return { data: ditemukan, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("santri")
    .select(PILIHAN_SANTRI)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Gagal membaca detail santri: ${error.message}`);
  }
  return {
    data: data ? barisDbKeSantri(data as unknown as BarisSantriDb) : null,
    sumberContoh: false,
  };
}

/**
 * Pencarian santri secara lokal (dipakai halaman daftar): cocok pada nama
 * santri ATAU nama ayah/wali, tidak peka huruf besar/kecil.
 */
export function cariSantri(daftar: Santri[], kataKunci: string): Santri[] {
  const kata = kataKunci.trim().toLowerCase();
  if (!kata) return daftar;
  return daftar.filter(
    (s) =>
      s.nama.toLowerCase().includes(kata) ||
      s.namaAyahWali.toLowerCase().includes(kata),
  );
}
