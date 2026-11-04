/**
 * Lapisan data — DINIYYAH (Jalur E, Tahap 2).
 *
 * POLA WAJIB tahap ini (data contoh):
 * - Bila env Supabase BELUM terisi, semua fungsi memakai DATA CONTOH FIKSI
 *   yang didefinisikan di file ini sendiri (disimpan sementara di memori;
 *   hilang saat muat ulang penuh) dan mengembalikan `sumberContoh: true`.
 * - Bila env terisi, fungsi memakai tabel `diniyyah_nilai_harian`,
 *   `diniyyah_ujian`, dan `semester` lewat klien Supabase
 *   (src/lib/supabase/client.ts); akses tetap dibatasi RLS di database.
 *
 * DUA HAL YANG BELUM FINAL pada modul ini (disengaja, menunggu user):
 * 1) DAFTAR MAPEL belum resmi — PDF jadwal diniyyah dari user belum ada.
 *    Daftar mapel hidup di SATU konstanta MAPEL_DINIYYAH_CONTOH di bawah
 *    ini; ganti isi konstanta itu saja bila PDF jadwal sudah diterima.
 *    Di UI, semua mapel ini wajib dilabeli "contoh".
 * 2) RUMUS RATA-RATA belum dikonfirmasi user. Sementara dipakai
 *    RATA-RATA SEDERHANA (lihat hitungRingkasanMapel) dan hasilnya wajib
 *    ditandai "rumus sementara" di UI.
 *
 * Halaman TIDAK boleh mengakses tabel / gudang contoh secara langsung;
 * selalu lewat fungsi di file ini.
 */
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung, type HasilSantri } from "@/lib/data/santri";
import { SANTRI_CONTOH } from "@/lib/contoh/santri-contoh";

/* ------------------------------------------------------------------ */
/* Konstanta mapel & slot — BAGIAN YANG MENUNGGU PDF JADWAL             */
/* ------------------------------------------------------------------ */

/**
 * === MAPEL CONTOH — MENUNGGU PDF JADWAL ===
 * Nilai di bawah ini CONTOH UMUM madrasah, BUKAN daftar mapel resmi
 * Ponpes Minhajus Sunnah. Daftar resmi menunggu PDF jadwal diniyyah
 * dari user. Bila PDF sudah diterima, ganti HANYA isi array ini.
 */
export const MAPEL_DINIYYAH_CONTOH: string[] = [
  "Nahwu",
  "Shorof",
  "Fiqih",
  "Tauhid",
];

/** Label yang wajib menyertai daftar mapel di UI selama masih contoh. */
export const LABEL_MAPEL_CONTOH = "MAPEL CONTOH — menunggu PDF jadwal";

/**
 * Slot waktu diniyyah yang SUDAH PASTI dari rancangan user (bukan contoh):
 * nilai harian dicatat per tanggal + mapel; slot ini jadwal kegiatannya.
 */
export const SLOT_DINIYYAH: string[] = [
  "10.30–11.30",
  "Ba'da Zhuhur",
  "Ba'da Ashr",
  "Ba'da Maghrib",
];

/** Penjelasan rumus yang tampil di UI selama rumus belum dikonfirmasi. */
export const CATATAN_RUMUS_SEMENTARA =
  "Rumus sementara — menunggu konfirmasi: rata-rata gabungan adalah rata-rata sederhana dari rata-rata nilai harian dan nilai ujian yang tersedia.";

/* ------------------------------------------------------------------ */
/* Tipe data                                                            */
/* ------------------------------------------------------------------ */

export type JenisSemester = "gasal" | "genap";

export const JENIS_SEMESTER: JenisSemester[] = ["gasal", "genap"];

export const LABEL_SEMESTER: Record<JenisSemester, string> = {
  gasal: "Semester Gasal",
  genap: "Semester Genap",
};

export interface SemesterRef {
  id: string;
  jenis: JenisSemester;
  nama: string;
  tahunAjaran: string;
  /**
   * Rentang tanggal semester (ISO YYYY-MM-DD). Dipakai halaman Grafik
   * untuk memilih semester yang sedang berjalan sebagai bawaan filter
   * (audit Fase 1). Opsional agar pemanggil lama tidak berubah.
   */
  tanggalMulai?: string;
  tanggalSelesai?: string;
}

export interface NilaiHarian {
  id: string;
  santriId: string;
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
  mapel: string;
  nilai: number;
  /** Id akun pengisi (gerbang aksi ubah/hapus: pemilik atau admin). */
  pengisiId: string | null;
  pengisiNama: string | null;
}

export interface NilaiUjian {
  id: string;
  santriId: string;
  semesterId: string;
  jenisSemester: JenisSemester;
  semesterNama: string;
  mapel: string;
  nilai: number;
  /** Id akun pengisi (gerbang aksi ubah/hapus: pemilik atau admin). */
  pengisiId: string | null;
  pengisiNama: string | null;
}

/**
 * Ringkasan satu mapel untuk tabel nilai.
 * rataGabungan memakai RUMUS SEMENTARA (rata-rata sederhana dari
 * komponen yang tersedia: rata-rata harian, ujian gasal, ujian genap).
 */
export interface RingkasanMapel {
  mapel: string;
  jumlahNilaiHarian: number;
  rataHarian: number | null;
  ujianGasal: number | null;
  ujianGenap: number | null;
  rataGabungan: number | null;
}

/** Nama pengisi pada mode contoh (fiktif). */
export const NAMA_PENGISI_CONTOH = "Ustadz Farhan Hidayat (contoh)";

/* ------------------------------------------------------------------ */
/* Hitung rata-rata — RUMUS SEMENTARA                                   */
/* ------------------------------------------------------------------ */

/** Rata-rata aritmetika sederhana; null bila daftar kosong. */
export function hitungRataRata(daftarNilai: number[]): number | null {
  if (daftarNilai.length === 0) return null;
  const total = daftarNilai.reduce((a, b) => a + b, 0);
  return total / daftarNilai.length;
}

/**
 * Susun ringkasan per mapel dari nilai harian & ujian satu santri.
 * RUMUS SEMENTARA (belum dikonfirmasi user): rata-rata gabungan =
 * rata-rata sederhana dari komponen yang tersedia (rata-rata harian,
 * nilai ujian gasal, nilai ujian genap) — BUKAN rata-rata berbobot.
 * Baris ditampilkan untuk semua mapel pada daftar mapel aktif plus
 * mapel lain yang kebetulan sudah punya nilai.
 */
export function hitungRingkasanMapel(
  harian: NilaiHarian[],
  ujian: NilaiUjian[],
  daftarMapel: string[] = MAPEL_DINIYYAH_CONTOH,
): RingkasanMapel[] {
  const semuaMapel = new Set<string>(daftarMapel);
  for (const n of harian) semuaMapel.add(n.mapel);
  for (const u of ujian) semuaMapel.add(u.mapel);

  return [...semuaMapel].map((mapel) => {
    const nilaiHarianMapel = harian
      .filter((n) => n.mapel === mapel)
      .map((n) => n.nilai);
    const rataHarian = hitungRataRata(nilaiHarianMapel);
    const ujianGasal =
      ujian.find((u) => u.mapel === mapel && u.jenisSemester === "gasal")
        ?.nilai ?? null;
    const ujianGenap =
      ujian.find((u) => u.mapel === mapel && u.jenisSemester === "genap")
        ?.nilai ?? null;
    const komponen = [rataHarian, ujianGasal, ujianGenap].filter(
      (x): x is number => x !== null,
    );
    return {
      mapel,
      jumlahNilaiHarian: nilaiHarianMapel.length,
      rataHarian,
      ujianGasal,
      ujianGenap,
      rataGabungan: hitungRataRata(komponen),
    };
  });
}

/** Format angka nilai untuk tampilan (maks. 1 angka di belakang koma). */
export function formatNilai(nilai: number | null): string {
  if (nilai === null || Number.isNaN(nilai)) return "—";
  return nilai.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/* ------------------------------------------------------------------ */
/* DATA CONTOH FIKSI (hanya mode contoh; id santri mengikuti             */
/* src/lib/contoh/santri-contoh.ts agar konsisten antar modul)          */
/* ------------------------------------------------------------------ */

const SEMESTER_CONTOH: SemesterRef[] = [
  {
    id: "contoh-semester-gasal",
    jenis: "gasal",
    nama: "Semester Gasal (Contoh)",
    tahunAjaran: "1448/1449 H (contoh)",
    // Rentang fiktif contoh; gasal selaras dengan SEMESTER_CONTOH di
    // lib/data/rekap.ts agar filter semester Grafik konsisten.
    tanggalMulai: "2026-07-01",
    tanggalSelesai: "2026-12-31",
  },
  {
    id: "contoh-semester-genap",
    jenis: "genap",
    nama: "Semester Genap (Contoh)",
    tahunAjaran: "1448/1449 H (contoh)",
    tanggalMulai: "2027-01-01",
    tanggalSelesai: "2027-06-30",
  },
];

let penomoranContoh = 100;
function idContohBaru(awalan: string): string {
  penomoranContoh += 1;
  return `contoh-diniyyah-${awalan}-${penomoranContoh}`;
}

const gudangHarianContoh: NilaiHarian[] = [
  { id: "contoh-diniyyah-harian-1", santriId: "d0000000-0000-4000-8000-000000000001", tanggal: "2026-10-26", mapel: "Nahwu", nilai: 80, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
  { id: "contoh-diniyyah-harian-2", santriId: "d0000000-0000-4000-8000-000000000001", tanggal: "2026-10-28", mapel: "Nahwu", nilai: 85, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
  { id: "contoh-diniyyah-harian-3", santriId: "d0000000-0000-4000-8000-000000000001", tanggal: "2026-11-01", mapel: "Nahwu", nilai: 90, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
  { id: "contoh-diniyyah-harian-4", santriId: "d0000000-0000-4000-8000-000000000001", tanggal: "2026-10-27", mapel: "Fiqih", nilai: 75, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
  { id: "contoh-diniyyah-harian-5", santriId: "d0000000-0000-4000-8000-000000000001", tanggal: "2026-10-29", mapel: "Fiqih", nilai: 88, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
  { id: "contoh-diniyyah-harian-6", santriId: "d0000000-0000-4000-8000-000000000003", tanggal: "2026-10-30", mapel: "Tauhid", nilai: 92, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
  { id: "contoh-diniyyah-harian-7", santriId: "d0000000-0000-4000-8000-000000000003", tanggal: "2026-10-30", mapel: "Shorof", nilai: 70, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
  { id: "contoh-diniyyah-harian-8", santriId: "d0000000-0000-4000-8000-000000000002", tanggal: "2026-11-01", mapel: "Nahwu", nilai: 65, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
];

const gudangUjianContoh: NilaiUjian[] = [
  { id: "contoh-diniyyah-ujian-1", santriId: "d0000000-0000-4000-8000-000000000001", semesterId: "contoh-semester-gasal", jenisSemester: "gasal", semesterNama: "Semester Gasal (Contoh)", mapel: "Nahwu", nilai: 82, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
  { id: "contoh-diniyyah-ujian-2", santriId: "d0000000-0000-4000-8000-000000000001", semesterId: "contoh-semester-gasal", jenisSemester: "gasal", semesterNama: "Semester Gasal (Contoh)", mapel: "Fiqih", nilai: 78, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
  { id: "contoh-diniyyah-ujian-3", santriId: "d0000000-0000-4000-8000-000000000003", semesterId: "contoh-semester-gasal", jenisSemester: "gasal", semesterNama: "Semester Gasal (Contoh)", mapel: "Tauhid", nilai: 95, pengisiNama: NAMA_PENGISI_CONTOH, pengisiId: null },
];

/** Nama santri contoh dari id-nya (mode contoh saja). */
export function namaSantriContoh(santriId: string): string | null {
  return SANTRI_CONTOH.find((s) => s.id === santriId)?.nama ?? null;
}

/* ------------------------------------------------------------------ */
/* Semester                                                             */
/* ------------------------------------------------------------------ */

/** Daftar semester (gasal/genap) yang tersedia. */
export async function ambilSemester(): Promise<HasilSantri<SemesterRef[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: semester fiktif.
    return { data: SEMESTER_CONTOH, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("semester")
    .select("id, jenis, nama, tahun_ajaran, tanggal_mulai, tanggal_selesai")
    .order("tanggal_mulai", { ascending: false });
  if (error) {
    throw new Error(`Gagal membaca daftar semester: ${error.message}`);
  }
  const baris = data as {
    id: string;
    jenis: JenisSemester;
    nama: string;
    tahun_ajaran: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
  }[];
  return {
    data: baris.map((b) => ({
      id: b.id,
      jenis: b.jenis,
      nama: b.nama,
      tahunAjaran: b.tahun_ajaran,
      tanggalMulai: b.tanggal_mulai,
      tanggalSelesai: b.tanggal_selesai,
    })),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Membaca nilai                                                        */
/* ------------------------------------------------------------------ */

interface BarisHarianDb {
  id: string;
  santri_id: string;
  tanggal: string;
  mapel: string;
  nilai: number | string;
  pengisi_id: string | null;
  pengisi: { nama: string } | null;
}

function barisDbKeHarian(b: BarisHarianDb): NilaiHarian {
  return {
    id: b.id,
    santriId: b.santri_id,
    tanggal: b.tanggal,
    mapel: b.mapel,
    nilai: Number(b.nilai),
    pengisiId: b.pengisi_id ?? null,
    pengisiNama: b.pengisi?.nama ?? null,
  };
}

/** Semua nilai harian satu santri, terbaru lebih dulu. */
export async function ambilNilaiHarianSantri(
  santriId: string,
): Promise<HasilSantri<NilaiHarian[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: saring gudang contoh di memori.
    const data = gudangHarianContoh
      .filter((n) => n.santriId === santriId)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return { data, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("diniyyah_nilai_harian")
    .select(
      "id, santri_id, tanggal, mapel, nilai, pengisi_id, pengisi:pengisi_id ( nama )",
    )
    .eq("santri_id", santriId)
    .order("tanggal", { ascending: false });
  if (error) {
    throw new Error(`Gagal membaca nilai harian: ${error.message}`);
  }
  return {
    data: (data as unknown as BarisHarianDb[]).map(barisDbKeHarian),
    sumberContoh: false,
  };
}

interface BarisUjianDb {
  id: string;
  santri_id: string;
  semester_id: string;
  mapel: string;
  nilai: number | string;
  pengisi_id: string | null;
  pengisi: { nama: string } | null;
  semester: { jenis: JenisSemester; nama: string } | null;
}

function barisDbKeUjian(b: BarisUjianDb): NilaiUjian {
  return {
    id: b.id,
    santriId: b.santri_id,
    semesterId: b.semester_id,
    jenisSemester: b.semester?.jenis ?? "gasal",
    semesterNama: b.semester?.nama ?? "-",
    mapel: b.mapel,
    nilai: Number(b.nilai),
    pengisiId: b.pengisi_id ?? null,
    pengisiNama: b.pengisi?.nama ?? null,
  };
}

/** Semua nilai ujian satu santri (gasal & genap). */
export async function ambilNilaiUjianSantri(
  santriId: string,
): Promise<HasilSantri<NilaiUjian[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: saring gudang contoh di memori.
    const data = gudangUjianContoh.filter((u) => u.santriId === santriId);
    return { data, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("diniyyah_ujian")
    .select(
      "id, santri_id, semester_id, mapel, nilai, pengisi_id, pengisi:pengisi_id ( nama ), semester:semester_id ( jenis, nama )",
    )
    .eq("santri_id", santriId)
    .order("mapel", { ascending: true });
  if (error) {
    throw new Error(`Gagal membaca nilai ujian: ${error.message}`);
  }
  return {
    data: (data as unknown as BarisUjianDb[]).map(barisDbKeUjian),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Menyimpan nilai                                                      */
/* ------------------------------------------------------------------ */

function periksaNilai(nilai: number): void {
  if (Number.isNaN(nilai) || nilai < 0 || nilai > 100) {
    throw new Error("Nilai harus berupa angka 0 sampai 100.");
  }
}

async function idPengisiAktif(): Promise<string> {
  const supabase = buatKlienBrowser();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Belum ada sesi login yang aktif; nilai tidak disimpan.");
  }
  return user.id;
}

export interface NilaiHarianBaru {
  santriId: string;
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
  mapel: string;
  nilai: number;
}

/**
 * Simpan satu nilai harian. Di database memakai upsert pada kunci unik
 * (santri, tanggal, mapel) — mengisi ulang tanggal+mapel yang sama
 * berarti memperbarui nilainya. Pengisi selalu pengguna yang login.
 */
export async function simpanNilaiHarian(
  masukan: NilaiHarianBaru,
): Promise<HasilSantri<NilaiHarian>> {
  if (!masukan.mapel.trim()) throw new Error("Mata pelajaran wajib dipilih.");
  periksaNilai(masukan.nilai);

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori (upsert tanggal+mapel).
    const lama = gudangHarianContoh.findIndex(
      (n) =>
        n.santriId === masukan.santriId &&
        n.tanggal === masukan.tanggal &&
        n.mapel === masukan.mapel,
    );
    const baris: NilaiHarian = {
      id: lama >= 0 ? gudangHarianContoh[lama].id : idContohBaru("harian"),
      santriId: masukan.santriId,
      tanggal: masukan.tanggal,
      mapel: masukan.mapel,
      nilai: masukan.nilai,
      pengisiNama: NAMA_PENGISI_CONTOH,
      pengisiId: null,
    };
    if (lama >= 0) gudangHarianContoh[lama] = baris;
    else gudangHarianContoh.unshift(baris);
    return { data: baris, sumberContoh: true };
  }

  const supabase = buatKlienBrowser();
  const pengisiId = await idPengisiAktif();
  const { data, error } = await supabase
    .from("diniyyah_nilai_harian")
    .upsert(
      {
        santri_id: masukan.santriId,
        tanggal: masukan.tanggal,
        mapel: masukan.mapel.trim(),
        nilai: masukan.nilai,
        pengisi_id: pengisiId,
      },
      { onConflict: "santri_id,tanggal,mapel" },
    )
    .select(
      "id, santri_id, tanggal, mapel, nilai, pengisi_id, pengisi:pengisi_id ( nama )",
    )
    .single();
  if (error) {
    throw new Error(`Gagal menyimpan nilai harian: ${error.message}`);
  }
  return {
    data: barisDbKeHarian(data as unknown as BarisHarianDb),
    sumberContoh: false,
  };
}

export interface NilaiUjianBaru {
  santriId: string;
  semesterId: string;
  mapel: string;
  nilai: number;
}

/**
 * Simpan satu nilai ujian semester (gasal/genap). Upsert pada kunci unik
 * (santri, semester, mapel). Pengisi selalu pengguna yang login.
 * Mode Supabase: semesterId wajib menunjuk baris semester yang sudah ada
 * (dibuat admin); bila tidak ada, fungsi melempar pesan jelas dan tidak
 * menyimpan apa pun.
 */
export async function simpanNilaiUjian(
  masukan: NilaiUjianBaru,
): Promise<HasilSantri<NilaiUjian>> {
  if (!masukan.mapel.trim()) throw new Error("Mata pelajaran wajib dipilih.");
  periksaNilai(masukan.nilai);

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori (upsert semester+mapel).
    const semester = SEMESTER_CONTOH.find((s) => s.id === masukan.semesterId);
    if (!semester) throw new Error("Semester contoh tidak ditemukan.");
    const lama = gudangUjianContoh.findIndex(
      (u) =>
        u.santriId === masukan.santriId &&
        u.semesterId === masukan.semesterId &&
        u.mapel === masukan.mapel,
    );
    const baris: NilaiUjian = {
      id: lama >= 0 ? gudangUjianContoh[lama].id : idContohBaru("ujian"),
      santriId: masukan.santriId,
      semesterId: masukan.semesterId,
      jenisSemester: semester.jenis,
      semesterNama: semester.nama,
      mapel: masukan.mapel,
      nilai: masukan.nilai,
      pengisiNama: NAMA_PENGISI_CONTOH,
      pengisiId: null,
    };
    if (lama >= 0) gudangUjianContoh[lama] = baris;
    else gudangUjianContoh.push(baris);
    return { data: baris, sumberContoh: true };
  }

  const supabase = buatKlienBrowser();
  const pengisiId = await idPengisiAktif();
  // Semester wajib baris yang BENAR-BENAR ada di database — jangan
  // mengarang semester di klien. Bila daftar semester masih kosong /
  // id tidak ditemukan, pesannya jelas: semester dibuat oleh admin
  // (lewat data semester), bukan dari form nilai ini.
  const { data: barisSemester, error: galatSemester } = await supabase
    .from("semester")
    .select("id")
    .eq("id", masukan.semesterId)
    .maybeSingle();
  if (galatSemester) {
    throw new Error(`Gagal memeriksa semester: ${galatSemester.message}`);
  }
  if (!barisSemester) {
    throw new Error(
      "Semester belum dibuat admin: belum ada data semester yang bisa dipilih untuk nilai ujian.",
    );
  }
  const { data, error } = await supabase
    .from("diniyyah_ujian")
    .upsert(
      {
        santri_id: masukan.santriId,
        semester_id: masukan.semesterId,
        mapel: masukan.mapel.trim(),
        nilai: masukan.nilai,
        pengisi_id: pengisiId,
      },
      { onConflict: "santri_id,semester_id,mapel" },
    )
    .select(
      "id, santri_id, semester_id, mapel, nilai, pengisi_id, pengisi:pengisi_id ( nama ), semester:semester_id ( jenis, nama )",
    )
    .single();
  if (error) {
    throw new Error(`Gagal menyimpan nilai ujian: ${error.message}`);
  }
  return {
    data: barisDbKeUjian(data as unknown as BarisUjianDb),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Mengubah & menghapus nilai tersimpan                                 */
/* ------------------------------------------------------------------ */

/**
 * Ubah nilai satu entri nilai harian tersimpan (koreksi). Hak akses
 * ditegakkan policy nilai_harian_ubah di database: Admin Utama ATAU
 * pengisi pemilik entri. Identitas entri (santri, tanggal, mapel)
 * tidak diubah — yang dikoreksi hanya angkanya.
 */
export async function ubahNilaiHarian(
  id: string,
  nilai: number,
): Promise<HasilSantri<NilaiHarian>> {
  periksaNilai(nilai);
  if (!supabaseTerhubung()) {
    // MODE CONTOH: ubah gudang contoh di memori.
    const lama = gudangHarianContoh.find((n) => n.id === id);
    if (!lama) throw new Error("Nilai harian contoh tidak ditemukan.");
    lama.nilai = nilai;
    return { data: lama, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("diniyyah_nilai_harian")
    .update({ nilai })
    .eq("id", id)
    .select(
      "id, santri_id, tanggal, mapel, nilai, pengisi_id, pengisi:pengisi_id ( nama )",
    )
    .maybeSingle();
  if (error) {
    throw new Error(`Gagal mengubah nilai harian: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      "Nilai tidak ditemukan, atau Anda tidak berhak mengubahnya (hanya pengisi pemilik entri atau Admin Utama).",
    );
  }
  return {
    data: barisDbKeHarian(data as unknown as BarisHarianDb),
    sumberContoh: false,
  };
}

/** Hapus satu entri nilai harian (policy nilai_harian_hapus). */
export async function hapusNilaiHarian(
  id: string,
): Promise<HasilSantri<{ terhapus: boolean }>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: hapus dari gudang contoh di memori.
    const indeks = gudangHarianContoh.findIndex((n) => n.id === id);
    if (indeks < 0) throw new Error("Nilai harian contoh tidak ditemukan.");
    gudangHarianContoh.splice(indeks, 1);
    return { data: { terhapus: true }, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("diniyyah_nilai_harian")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error(`Gagal menghapus nilai harian: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(
      "Nilai tidak ditemukan, atau Anda tidak berhak menghapusnya (hanya pengisi pemilik entri atau Admin Utama).",
    );
  }
  return { data: { terhapus: true }, sumberContoh: false };
}

/**
 * Ubah nilai satu entri nilai ujian tersimpan (koreksi). Hak akses
 * ditegakkan policy ujian_diniyyah_ubah: Admin Utama ATAU pengisi
 * pemilik entri. Identitas entri (santri, semester, mapel) tetap.
 */
export async function ubahNilaiUjian(
  id: string,
  nilai: number,
): Promise<HasilSantri<NilaiUjian>> {
  periksaNilai(nilai);
  if (!supabaseTerhubung()) {
    // MODE CONTOH: ubah gudang contoh di memori.
    const lama = gudangUjianContoh.find((u) => u.id === id);
    if (!lama) throw new Error("Nilai ujian contoh tidak ditemukan.");
    lama.nilai = nilai;
    return { data: lama, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("diniyyah_ujian")
    .update({ nilai })
    .eq("id", id)
    .select(
      "id, santri_id, semester_id, mapel, nilai, pengisi_id, pengisi:pengisi_id ( nama ), semester:semester_id ( jenis, nama )",
    )
    .maybeSingle();
  if (error) {
    throw new Error(`Gagal mengubah nilai ujian: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      "Nilai tidak ditemukan, atau Anda tidak berhak mengubahnya (hanya pengisi pemilik entri atau Admin Utama).",
    );
  }
  return {
    data: barisDbKeUjian(data as unknown as BarisUjianDb),
    sumberContoh: false,
  };
}

/** Hapus satu entri nilai ujian (policy ujian_diniyyah_hapus). */
export async function hapusNilaiUjian(
  id: string,
): Promise<HasilSantri<{ terhapus: boolean }>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: hapus dari gudang contoh di memori.
    const indeks = gudangUjianContoh.findIndex((u) => u.id === id);
    if (indeks < 0) throw new Error("Nilai ujian contoh tidak ditemukan.");
    gudangUjianContoh.splice(indeks, 1);
    return { data: { terhapus: true }, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("diniyyah_ujian")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error(`Gagal menghapus nilai ujian: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(
      "Nilai tidak ditemukan, atau Anda tidak berhak menghapusnya (hanya pengisi pemilik entri atau Admin Utama).",
    );
  }
  return { data: { terhapus: true }, sumberContoh: false };
}
