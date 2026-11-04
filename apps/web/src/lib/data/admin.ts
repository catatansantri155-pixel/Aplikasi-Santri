/**
 * Lapisan data — PANEL ADMIN (kelola data induk).
 *
 * Tiga urusan, semuanya khusus admin (gerbang tampilan: modul "admin"
 * di src/lib/akses.ts; penegakan asli: kebijakan *_tulis_admin di
 * supabase/migrations/0003_rls.sql):
 * 1. SANTRI: daftar SEMUA santri (termasuk nonaktif — berbeda dari
 *    ambilDaftarSantri() yang hanya menampilkan yang aktif), tambah,
 *    ubah nama / nama ayah-wali / kelas, aktif/nonaktifkan
 *    (kolom `status_aktif` memang ada di skema 0001).
 * 2. SEMESTER: daftar lengkap + buat baru (nama, jenis gasal/genap,
 *    tahun ajaran, tanggal mulai & selesai). BATAS SKEMA: tabel
 *    `semester` TIDAK punya kolom penanda aktif — semester yang
 *    "sedang berjalan" diturunkan dari rentang tanggalnya (tanggal
 *    hari ini berada di antara tanggal_mulai dan tanggal_selesai),
 *    bukan dari isian admin. Unik di database: (tahun_ajaran, jenis).
 * 3. TAUTAN WALI: daftar akun berperan wali dari `profiles`, tautan
 *    wali <-> santri dari `wali_santri` (tambah & hapus). Membuat
 *    AKUN login wali baru BUKAN urusan lapisan ini: akun dibuat lewat
 *    Supabase Auth (panel autentikasi), baris profiles-nya ditambah,
 *    baru ditautkan di sini.
 *
 * POLA WAJIB (sama seperti lapisan data lain):
 * - Bila env Supabase BELUM terisi, semua fungsi memakai DATA CONTOH
 *   FIKSI dari src/lib/contoh/admin-contoh.ts (gudang sementara di
 *   memori; hilang saat muat ulang penuh) dan mengembalikan
 *   `sumberContoh: true`. Tidak ada tulisan apa pun ke Supabase pada
 *   mode contoh.
 * - Bila env terisi, fungsi memakai tabel asli lewat klien Supabase.
 *
 * Halaman TIDAK boleh mengakses tabel / gudang contoh secara langsung;
 * selalu lewat fungsi di file ini.
 */
import { buatKlienBrowser } from "@/lib/supabase/client";
import {
  supabaseTerhubung,
  type HasilSantri,
  type KelasRingkasan,
  type Santri,
} from "@/lib/data/santri";
import { LABEL_SEMESTER, type JenisSemester } from "@/lib/data/diniyyah";
import { KELAS_CONTOH } from "@/lib/contoh/santri-contoh";
import {
  AKUN_WALI_CONTOH,
  semuaSantriAdminContoh,
  semuaSemesterAdminContoh,
  semuaTautanWaliContoh,
  tambahSantriAdminContoh,
  tambahSemesterAdminContoh,
  tambahTautanWaliContoh,
  ubahSantriAdminContoh,
  ubahSemesterAdminContoh,
  aturStatusAktifSantriAdminContoh,
  hapusSemesterAdminContoh,
  hapusTautanWaliContoh,
  idSantriAdminContohBaru,
  idSemesterAdminContohBaru,
} from "@/lib/contoh/admin-contoh";

export { LABEL_SEMESTER };
export type { JenisSemester, KelasRingkasan, Santri };

/* ------------------------------------------------------------------ */
/* Kelas                                                                */
/* ------------------------------------------------------------------ */

/** Daftar kelas (tingkat 1, 2, 3) untuk pemilih kelas di formulir. */
export async function ambilKelasAdmin(): Promise<
  HasilSantri<KelasRingkasan[]>
> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: kelas fiksi dari santri-contoh.ts.
    return {
      data: KELAS_CONTOH.map((k) => ({
        id: k.id,
        tingkat: k.tingkat,
        nama: k.nama,
      })),
      sumberContoh: true,
    };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("kelas")
    .select("id, tingkat, nama")
    .order("tingkat", { ascending: true });
  if (error) {
    throw new Error(`Gagal membaca daftar kelas: ${error.message}`);
  }
  return {
    data: data as KelasRingkasan[],
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Santri — kelola (semua status)                                       */
/* ------------------------------------------------------------------ */

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

const PILIHAN_SANTRI_ADMIN =
  "id, nama, nama_ayah_wali, kelas_id, nis, status_aktif, kelas:kelas_id ( id, tingkat, nama )";

function lengkapiSantriContoh(
  dasar: {
    id: string;
    nama: string;
    namaAyahWali: string;
    kelasId: string;
    nis: string | null;
    statusAktif: boolean;
  },
  daftarKelas: KelasRingkasan[],
): Santri {
  const kelas = daftarKelas.find((k) => k.id === dasar.kelasId);
  return {
    ...dasar,
    kelasTingkat: kelas?.tingkat ?? 0,
    kelasNama: kelas?.nama ?? "Tanpa Kelas",
  };
}

/**
 * Daftar SEMUA santri untuk pengelolaan admin — termasuk yang
 * nonaktif (santri nonaktif tidak tampil di modul-modul lain).
 */
export async function ambilSemuaSantriAdmin(): Promise<
  HasilSantri<Santri[]>
> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: gudang contoh admin (memori).
    const daftarKelas = (await ambilKelasAdmin()).data;
    const data = semuaSantriAdminContoh()
      .map((s) => lengkapiSantriContoh(s, daftarKelas))
      .sort((a, b) => a.nama.localeCompare(b.nama));
    return { data, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("santri")
    .select(PILIHAN_SANTRI_ADMIN)
    .order("nama", { ascending: true });
  if (error) {
    throw new Error(`Gagal membaca daftar santri: ${error.message}`);
  }
  return {
    data: (data as unknown as BarisSantriDb[]).map(barisDbKeSantri),
    sumberContoh: false,
  };
}

export interface MasukanSantri {
  nama: string;
  namaAyahWali: string;
  kelasId: string;
}

function bersihkanMasukanSantri(masukan: MasukanSantri): MasukanSantri {
  const bersih = {
    nama: masukan.nama.trim(),
    namaAyahWali: masukan.namaAyahWali.trim(),
    kelasId: masukan.kelasId,
  };
  if (!bersih.nama) throw new Error("Nama santri wajib diisi.");
  if (!bersih.namaAyahWali) {
    throw new Error("Nama ayah/wali santri wajib diisi.");
  }
  if (!bersih.kelasId) throw new Error("Kelas santri wajib dipilih.");
  return bersih;
}

/** Tambah santri baru (status langsung aktif). */
export async function tambahSantriAdmin(
  masukan: MasukanSantri,
): Promise<HasilSantri<Santri>> {
  const bersih = bersihkanMasukanSantri(masukan);

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori.
    const daftarKelas = (await ambilKelasAdmin()).data;
    const kelas = daftarKelas.find((k) => k.id === bersih.kelasId);
    if (!kelas) throw new Error("Kelas yang dipilih tidak ditemukan.");
    const baru = tambahSantriAdminContoh({
      id: idSantriAdminContohBaru(),
      nama: bersih.nama,
      namaAyahWali: bersih.namaAyahWali,
      kelasId: bersih.kelasId,
      nis: null,
      statusAktif: true,
    });
    return {
      data: lengkapiSantriContoh(baru, daftarKelas),
      sumberContoh: true,
    };
  }

  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("santri")
    .insert({
      nama: bersih.nama,
      nama_ayah_wali: bersih.namaAyahWali,
      kelas_id: bersih.kelasId,
    })
    .select(PILIHAN_SANTRI_ADMIN)
    .single();
  if (error) {
    throw new Error(`Gagal menambah santri: ${error.message}`);
  }
  return {
    data: barisDbKeSantri(data as unknown as BarisSantriDb),
    sumberContoh: false,
  };
}

/** Ubah nama, nama ayah/wali, dan kelas satu santri. */
export async function ubahSantriAdmin(
  santriId: string,
  masukan: MasukanSantri,
): Promise<HasilSantri<Santri>> {
  const bersih = bersihkanMasukanSantri(masukan);

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori.
    const daftarKelas = (await ambilKelasAdmin()).data;
    const diubah = ubahSantriAdminContoh(santriId, bersih);
    if (!diubah) throw new Error("Santri contoh tidak ditemukan.");
    return {
      data: lengkapiSantriContoh(diubah, daftarKelas),
      sumberContoh: true,
    };
  }

  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("santri")
    .update({
      nama: bersih.nama,
      nama_ayah_wali: bersih.namaAyahWali,
      kelas_id: bersih.kelasId,
    })
    .eq("id", santriId)
    .select(PILIHAN_SANTRI_ADMIN)
    .single();
  if (error) {
    throw new Error(`Gagal mengubah santri: ${error.message}`);
  }
  return {
    data: barisDbKeSantri(data as unknown as BarisSantriDb),
    sumberContoh: false,
  };
}

/** Aktifkan / nonaktifkan satu santri (kolom status_aktif). */
export async function aturStatusAktifSantriAdmin(
  santriId: string,
  aktif: boolean,
): Promise<HasilSantri<Santri>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori.
    const daftarKelas = (await ambilKelasAdmin()).data;
    const diubah = aturStatusAktifSantriAdminContoh(santriId, aktif);
    if (!diubah) throw new Error("Santri contoh tidak ditemukan.");
    return {
      data: lengkapiSantriContoh(diubah, daftarKelas),
      sumberContoh: true,
    };
  }

  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("santri")
    .update({ status_aktif: aktif })
    .eq("id", santriId)
    .select(PILIHAN_SANTRI_ADMIN)
    .single();
  if (error) {
    throw new Error(`Gagal mengubah status santri: ${error.message}`);
  }
  return {
    data: barisDbKeSantri(data as unknown as BarisSantriDb),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Semester                                                             */
/* ------------------------------------------------------------------ */

export interface SemesterLengkap {
  id: string;
  nama: string;
  jenis: JenisSemester;
  tahunAjaran: string;
  /** Format ISO: YYYY-MM-DD */
  tanggalMulai: string;
  /** Format ISO: YYYY-MM-DD */
  tanggalSelesai: string;
}

/**
 * Keadaan semester terhadap satu tanggal acuan. Skema TIDAK punya
 * kolom penanda aktif: keadaan ini murni turunan rentang tanggal.
 */
export type StatusSemester = "berjalan" | "akan-datang" | "selesai";

export const LABEL_STATUS_SEMESTER: Record<StatusSemester, string> = {
  berjalan: "Sedang berjalan",
  "akan-datang": "Belum mulai",
  selesai: "Sudah selesai",
};

/** Tanggal hari ini lokal dalam format ISO YYYY-MM-DD. */
export function tanggalHariIniIso(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/**
 * Status semester pada tanggal acuan (bawaan: hari ini). Perbandingan
 * string aman karena format ISO YYYY-MM-DD terurut leksikografis.
 */
export function statusSemester(
  semester: Pick<SemesterLengkap, "tanggalMulai" | "tanggalSelesai">,
  tanggalAcuan: string = tanggalHariIniIso(),
): StatusSemester {
  if (tanggalAcuan < semester.tanggalMulai) return "akan-datang";
  if (tanggalAcuan > semester.tanggalSelesai) return "selesai";
  return "berjalan";
}

/** Daftar semester lengkap, tanggal mulai terbaru dulu. */
export async function ambilSemesterAdmin(): Promise<
  HasilSantri<SemesterLengkap[]>
> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: gudang contoh admin (memori).
    const data = semuaSemesterAdminContoh().sort((a, b) =>
      b.tanggalMulai.localeCompare(a.tanggalMulai),
    );
    return { data, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("semester")
    .select("id, nama, jenis, tahun_ajaran, tanggal_mulai, tanggal_selesai")
    .order("tanggal_mulai", { ascending: false });
  if (error) {
    throw new Error(`Gagal membaca daftar semester: ${error.message}`);
  }
  const baris = data as {
    id: string;
    nama: string;
    jenis: JenisSemester;
    tahun_ajaran: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
  }[];
  return {
    data: baris.map((b) => ({
      id: b.id,
      nama: b.nama,
      jenis: b.jenis,
      tahunAjaran: b.tahun_ajaran,
      tanggalMulai: b.tanggal_mulai,
      tanggalSelesai: b.tanggal_selesai,
    })),
    sumberContoh: false,
  };
}

export interface MasukanSemester {
  nama: string;
  jenis: JenisSemester;
  tahunAjaran: string;
  tanggalMulai: string;
  tanggalSelesai: string;
}

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Rapikan + periksa masukan semester (dipakai buat & ubah). */
function bersihkanMasukanSemester(
  masukan: MasukanSemester,
): MasukanSemester {
  const bersih: MasukanSemester = {
    nama: masukan.nama.trim(),
    jenis: masukan.jenis,
    tahunAjaran: masukan.tahunAjaran.trim(),
    tanggalMulai: masukan.tanggalMulai,
    tanggalSelesai: masukan.tanggalSelesai,
  };
  if (!bersih.nama) throw new Error("Nama semester wajib diisi.");
  if (!bersih.tahunAjaran) throw new Error("Tahun ajaran wajib diisi.");
  if (!POLA_TANGGAL.test(bersih.tanggalMulai)) {
    throw new Error("Tanggal mulai semester wajib dipilih.");
  }
  if (!POLA_TANGGAL.test(bersih.tanggalSelesai)) {
    throw new Error("Tanggal selesai semester wajib dipilih.");
  }
  if (bersih.tanggalSelesai < bersih.tanggalMulai) {
    throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  }
  return bersih;
}

/** Buat semester baru. Unik di database: (tahun_ajaran, jenis). */
export async function tambahSemesterAdmin(
  masukan: MasukanSemester,
): Promise<HasilSantri<SemesterLengkap>> {
  const bersih = bersihkanMasukanSemester(masukan);

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori; unik
    // (tahun ajaran + jenis) ditiru dari batasan database.
    const duplikat = semuaSemesterAdminContoh().find(
      (s) => s.tahunAjaran === bersih.tahunAjaran && s.jenis === bersih.jenis,
    );
    if (duplikat) {
      throw new Error(
        `Sudah ada semester ${LABEL_SEMESTER[bersih.jenis]} untuk tahun ajaran ${bersih.tahunAjaran}.`,
      );
    }
    const baru = tambahSemesterAdminContoh({
      id: idSemesterAdminContohBaru(),
      ...bersih,
    });
    return { data: baru, sumberContoh: true };
  }

  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("semester")
    .insert({
      nama: bersih.nama,
      jenis: bersih.jenis,
      tahun_ajaran: bersih.tahunAjaran,
      tanggal_mulai: bersih.tanggalMulai,
      tanggal_selesai: bersih.tanggalSelesai,
    })
    .select("id, nama, jenis, tahun_ajaran, tanggal_mulai, tanggal_selesai")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `Sudah ada semester ${LABEL_SEMESTER[bersih.jenis]} untuk tahun ajaran ${bersih.tahunAjaran}.`,
      );
    }
    throw new Error(`Gagal membuat semester: ${error.message}`);
  }
  const baris = data as {
    id: string;
    nama: string;
    jenis: JenisSemester;
    tahun_ajaran: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
  };
  return {
    data: {
      id: baris.id,
      nama: baris.nama,
      jenis: baris.jenis,
      tahunAjaran: baris.tahun_ajaran,
      tanggalMulai: baris.tanggal_mulai,
      tanggalSelesai: baris.tanggal_selesai,
    },
    sumberContoh: false,
  };
}

/**
 * Ubah nama, jenis, tahun ajaran, dan rentang tanggal satu semester.
 * Khusus admin (policy semester_tulis_admin). Unik (tahun_ajaran,
 * jenis) tetap dijaga database.
 */
export async function ubahSemesterAdmin(
  semesterId: string,
  masukan: MasukanSemester,
): Promise<HasilSantri<SemesterLengkap>> {
  const bersih = bersihkanMasukanSemester(masukan);

  if (!supabaseTerhubung()) {
    // MODE CONTOH: ubah gudang contoh di memori; unik
    // (tahun ajaran + jenis) ditiru dari batasan database.
    const duplikat = semuaSemesterAdminContoh().find(
      (s) =>
        s.id !== semesterId &&
        s.tahunAjaran === bersih.tahunAjaran &&
        s.jenis === bersih.jenis,
    );
    if (duplikat) {
      throw new Error(
        `Sudah ada semester ${LABEL_SEMESTER[bersih.jenis]} untuk tahun ajaran ${bersih.tahunAjaran}.`,
      );
    }
    const diubah = ubahSemesterAdminContoh(semesterId, bersih);
    if (!diubah) throw new Error("Semester contoh tidak ditemukan.");
    return { data: diubah, sumberContoh: true };
  }

  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("semester")
    .update({
      nama: bersih.nama,
      jenis: bersih.jenis,
      tahun_ajaran: bersih.tahunAjaran,
      tanggal_mulai: bersih.tanggalMulai,
      tanggal_selesai: bersih.tanggalSelesai,
    })
    .eq("id", semesterId)
    .select("id, nama, jenis, tahun_ajaran, tanggal_mulai, tanggal_selesai")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `Sudah ada semester ${LABEL_SEMESTER[bersih.jenis]} untuk tahun ajaran ${bersih.tahunAjaran}.`,
      );
    }
    throw new Error(`Gagal mengubah semester: ${error.message}`);
  }
  if (!data) {
    throw new Error("Semester tidak ditemukan.");
  }
  const baris = data as {
    id: string;
    nama: string;
    jenis: JenisSemester;
    tahun_ajaran: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
  };
  return {
    data: {
      id: baris.id,
      nama: baris.nama,
      jenis: baris.jenis,
      tahunAjaran: baris.tahun_ajaran,
      tanggalMulai: baris.tanggal_mulai,
      tanggalSelesai: baris.tanggal_selesai,
    },
    sumberContoh: false,
  };
}

/**
 * Hapus satu semester. Khusus admin (policy semester_tulis_admin).
 * KEAMANAN DATA: semester yang sudah dipakai baris nilai ujian
 * (hifzh_ujian / diniyyah_ujian, kunci asing TANPA cascade) TIDAK
 * dapat dihapus — database menolaknya (23503) dan pesan di bawah
 * menjelaskannya. Tabel semester tidak punya kolom penanda
 * aktif/nonaktif, jadi tidak ada jalur "nonaktifkan" tanpa mengubah
 * skema; semester semacam itu cukup dibiarkan (tidak mengganggu,
 * karena pilihan semester di form ujian mengikuti data yang ada).
 */
export async function hapusSemesterAdmin(
  semesterId: string,
): Promise<HasilSantri<{ terhapus: boolean }>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: hapus dari gudang contoh di memori.
    return {
      data: { terhapus: hapusSemesterAdminContoh(semesterId) },
      sumberContoh: true,
    };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("semester")
    .delete()
    .eq("id", semesterId)
    .select("id");
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Semester ini sudah dipakai oleh nilai ujian (hifzh/diniyyah), sehingga tidak dapat dihapus agar riwayat nilai tetap utuh. Semester yang belum dipakai nilai ujian mana pun dapat dihapus.",
      );
    }
    throw new Error(`Gagal menghapus semester: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("Semester tidak ditemukan.");
  }
  return { data: { terhapus: true }, sumberContoh: false };
}

/* ------------------------------------------------------------------ */
/* Tautan wali                                                          */
/* ------------------------------------------------------------------ */

export interface AkunWali {
  id: string;
  nama: string;
}

export interface TautanWali {
  profileId: string;
  santriId: string;
}

/** Daftar akun berperan wali dari tabel profiles, terurut nama. */
export async function ambilAkunWali(): Promise<HasilSantri<AkunWali[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: akun wali fiksi.
    return { data: [...AKUN_WALI_CONTOH], sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nama")
    .eq("peran", "wali")
    .order("nama", { ascending: true });
  if (error) {
    throw new Error(`Gagal membaca daftar akun wali: ${error.message}`);
  }
  return {
    data: data as AkunWali[],
    sumberContoh: false,
  };
}

/** Semua tautan wali <-> santri yang tersimpan. */
export async function ambilTautanWali(): Promise<
  HasilSantri<TautanWali[]>
> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: gudang contoh admin (memori).
    return { data: semuaTautanWaliContoh(), sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("wali_santri")
    .select("profile_id, santri_id")
    .order("profile_id", { ascending: true });
  if (error) {
    throw new Error(`Gagal membaca tautan wali: ${error.message}`);
  }
  const baris = data as { profile_id: string; santri_id: string }[];
  return {
    data: baris.map((b) => ({
      profileId: b.profile_id,
      santriId: b.santri_id,
    })),
    sumberContoh: false,
  };
}

/** Tautkan satu akun wali ke satu santri. */
export async function tambahTautanWali(
  profileId: string,
  santriId: string,
): Promise<HasilSantri<TautanWali>> {
  if (!profileId) throw new Error("Akun wali wajib dipilih.");
  if (!santriId) throw new Error("Santri wajib dipilih.");

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori.
    const duplikat = semuaTautanWaliContoh().find(
      (t) => t.profileId === profileId && t.santriId === santriId,
    );
    if (duplikat) throw new Error("Tautan itu sudah ada.");
    return {
      data: tambahTautanWaliContoh(profileId, santriId),
      sumberContoh: true,
    };
  }

  const supabase = buatKlienBrowser();
  const { error } = await supabase
    .from("wali_santri")
    .insert({ profile_id: profileId, santri_id: santriId });
  if (error) {
    if (error.code === "23505") {
      throw new Error("Tautan itu sudah ada.");
    }
    throw new Error(`Gagal menautkan wali: ${error.message}`);
  }
  return { data: { profileId, santriId }, sumberContoh: false };
}

/** Lepas tautan satu akun wali dari satu santri. */
export async function hapusTautanWali(
  profileId: string,
  santriId: string,
): Promise<HasilSantri<{ terhapus: boolean }>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori.
    return {
      data: { terhapus: hapusTautanWaliContoh(profileId, santriId) },
      sumberContoh: true,
    };
  }
  const supabase = buatKlienBrowser();
  const { error } = await supabase
    .from("wali_santri")
    .delete()
    .eq("profile_id", profileId)
    .eq("santri_id", santriId);
  if (error) {
    throw new Error(`Gagal melepas tautan wali: ${error.message}`);
  }
  return { data: { terhapus: true }, sumberContoh: false };
}
