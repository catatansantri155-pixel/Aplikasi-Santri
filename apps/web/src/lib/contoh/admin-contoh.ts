/**
 * DATA CONTOH (FIKSI) — panel admin: santri (semua status), semester
 * lengkap, akun wali contoh, dan tautan wali <-> santri.
 *
 * Dipakai HANYA bila env Supabase belum terisi (lihat
 * src/lib/data/admin.ts). Seluruh nama FIKTIF mengikuti pola samaran
 * "Fulan" dari santri-contoh.ts — tidak ada data asli di sini.
 *
 * Penyimpanan contoh bersifat SEMENTARA di memori modul ini: tambah /
 * ubah santri, semester baru, dan perubahan tautan yang dibuat dari
 * panel admin terlihat selama sesi halaman hidup, dan hilang saat
 * halaman dimuat ulang dari awal (full reload). Di database asli,
 * semua ini persisten di tabel `santri`, `semester`, `profiles`, dan
 * `wali_santri`, dengan tulis hanya untuk admin
 * (kebijakan *_tulis_admin di supabase/migrations/0003_rls.sql).
 *
 * Catatan konsistensi contoh:
 * - Santri awal disalin dari SANTRI_CONTOH (id sama persis), tetapi
 *   gudangnya TERPISAH: perubahan dari panel admin contoh tidak
 *   mengubah data contoh yang dibaca modul lain (pola yang sama
 *   seperti gudang contoh olahraga).
 * - Semester awal memakai id & nama yang sama dengan semester contoh
 *   di lapisan data diniyyah/rekap ("contoh-semester-gasal" /
 *   "contoh-semester-genap") dan rentang gasal yang sama dengan rekap
 *   (1 Jul – 31 Des 2026, SEMENTARA — tanggal resmi menunggu user).
 * - Akun wali contoh tidak ada padanannya di seed database (baris
 *   `profiles` wajib menunjuk akun Supabase Auth nyata, jadi seed
 *   0004 memang tidak membuatnya); di sini dibuat fiksi murni tampilan.
 */
import { SANTRI_CONTOH } from "@/lib/contoh/santri-contoh";

/* ------------------------------------------------------------------ */
/* Santri (semua status, termasuk nonaktif)                             */
/* ------------------------------------------------------------------ */

export interface SantriAdminContoh {
  id: string;
  nama: string;
  namaAyahWali: string;
  kelasId: string;
  nis: string | null;
  statusAktif: boolean;
}

const gudangSantri: SantriAdminContoh[] = SANTRI_CONTOH.map((s) => ({
  id: s.id,
  nama: s.nama,
  namaAyahWali: s.namaAyahWali,
  kelasId: s.kelasId,
  nis: s.nis,
  statusAktif: s.statusAktif,
}));

let penomoranSantri = 0;

export function semuaSantriAdminContoh(): SantriAdminContoh[] {
  return [...gudangSantri];
}

export function idSantriAdminContohBaru(): string {
  penomoranSantri += 1;
  return `santri-contoh-baru-${penomoranSantri}`;
}

export function tambahSantriAdminContoh(
  santri: SantriAdminContoh,
): SantriAdminContoh {
  gudangSantri.push(santri);
  return santri;
}

export function ubahSantriAdminContoh(
  id: string,
  ubahan: { nama: string; namaAyahWali: string; kelasId: string },
): SantriAdminContoh | null {
  const indeks = gudangSantri.findIndex((s) => s.id === id);
  if (indeks < 0) return null;
  gudangSantri[indeks] = { ...gudangSantri[indeks], ...ubahan };
  return gudangSantri[indeks];
}

export function aturStatusAktifSantriAdminContoh(
  id: string,
  aktif: boolean,
): SantriAdminContoh | null {
  const indeks = gudangSantri.findIndex((s) => s.id === id);
  if (indeks < 0) return null;
  gudangSantri[indeks] = { ...gudangSantri[indeks], statusAktif: aktif };
  return gudangSantri[indeks];
}

/* ------------------------------------------------------------------ */
/* Semester lengkap (dengan rentang tanggal)                            */
/* ------------------------------------------------------------------ */

export interface SemesterAdminContoh {
  id: string;
  nama: string;
  jenis: "gasal" | "genap";
  tahunAjaran: string;
  /** Format ISO: YYYY-MM-DD */
  tanggalMulai: string;
  /** Format ISO: YYYY-MM-DD */
  tanggalSelesai: string;
}

const gudangSemester: SemesterAdminContoh[] = [
  {
    id: "contoh-semester-gasal",
    nama: "Semester Gasal (Contoh)",
    jenis: "gasal",
    tahunAjaran: "1448/1449 H (contoh)",
    tanggalMulai: "2026-07-01",
    tanggalSelesai: "2026-12-31",
  },
  {
    id: "contoh-semester-genap",
    nama: "Semester Genap (Contoh)",
    jenis: "genap",
    tahunAjaran: "1448/1449 H (contoh)",
    tanggalMulai: "2027-01-01",
    tanggalSelesai: "2027-06-30",
  },
];

let penomoranSemester = 0;

export function semuaSemesterAdminContoh(): SemesterAdminContoh[] {
  return [...gudangSemester];
}

export function idSemesterAdminContohBaru(): string {
  penomoranSemester += 1;
  return `semester-contoh-baru-${penomoranSemester}`;
}

export function tambahSemesterAdminContoh(
  semester: SemesterAdminContoh,
): SemesterAdminContoh {
  gudangSemester.push(semester);
  return semester;
}

/* ------------------------------------------------------------------ */
/* Akun wali contoh & tautan wali <-> santri                            */
/* ------------------------------------------------------------------ */

export interface AkunWaliContoh {
  id: string;
  nama: string;
}

export const AKUN_WALI_CONTOH: AkunWaliContoh[] = [
  { id: "profil-contoh-wali-1", nama: "Fulan Ayah Alif (Contoh)" },
  { id: "profil-contoh-wali-2", nama: "Fulan Ayah Candra (Contoh)" },
  { id: "profil-contoh-wali-3", nama: "Fulan Ayah Eko (Contoh)" },
];

export interface TautanWaliContoh {
  profileId: string;
  santriId: string;
}

const gudangTautan: TautanWaliContoh[] = [
  // Wali 1 -> anaknya santri contoh pertama (Kelas 1), mengikuti pola
  // tautan contoh pada komentar seed 0004.
  {
    profileId: "profil-contoh-wali-1",
    santriId: "d0000000-0000-4000-8000-000000000001",
  },
  {
    profileId: "profil-contoh-wali-2",
    santriId: "d0000000-0000-4000-8000-000000000003",
  },
  // Wali 3 sengaja belum punya tautan: contoh keadaan awal penautan.
];

export function semuaTautanWaliContoh(): TautanWaliContoh[] {
  return [...gudangTautan];
}

export function tambahTautanWaliContoh(
  profileId: string,
  santriId: string,
): TautanWaliContoh {
  const sudahAda = gudangTautan.find(
    (t) => t.profileId === profileId && t.santriId === santriId,
  );
  if (sudahAda) return sudahAda;
  const tautan: TautanWaliContoh = { profileId, santriId };
  gudangTautan.push(tautan);
  return tautan;
}

export function hapusTautanWaliContoh(
  profileId: string,
  santriId: string,
): boolean {
  const indeks = gudangTautan.findIndex(
    (t) => t.profileId === profileId && t.santriId === santriId,
  );
  if (indeks < 0) return false;
  gudangTautan.splice(indeks, 1);
  return true;
}
