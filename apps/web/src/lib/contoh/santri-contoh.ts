/**
 * DATA CONTOH (FIKSI) — santri, kelas, dan jadwal sesi.
 *
 * PERINGATAN: seluruh nama di file ini FIKTIF (pola nama samaran "Fulan"),
 * BUKAN data santri asli. Dipakai HANYA bila env Supabase belum terisi
 * (lihat src/lib/data/santri.ts), agar halaman tetap bisa dirender & diuji
 * sebelum proyek Supabase dibuat pada Tahap 3.
 *
 * id di bawah sengaja disamakan dengan seed contoh database
 * (supabase/migrations/0004_seed_contoh.sql) agar peralihan dari data
 * contoh ke database nanti tidak mengubah bentuk data.
 */

export interface KelasContoh {
  id: string;
  tingkat: 1 | 2 | 3;
  nama: string;
}

export interface SantriContoh {
  id: string;
  nama: string;
  namaAyahWali: string;
  kelasId: string;
  nis: string | null;
  statusAktif: boolean;
}

export interface JadwalContoh {
  id: string;
  /** Sama dengan enum sesi_jenis di database. */
  jenis: "hifzh" | "diniyyah" | "olahraga";
  jamLabel: string;
  mapel: string | null;
}

export const KELAS_CONTOH: KelasContoh[] = [
  { id: "a0000000-0000-4000-8000-000000000001", tingkat: 1, nama: "Kelas 1" },
  { id: "a0000000-0000-4000-8000-000000000002", tingkat: 2, nama: "Kelas 2" },
  { id: "a0000000-0000-4000-8000-000000000003", tingkat: 3, nama: "Kelas 3" },
];

export const SANTRI_CONTOH: SantriContoh[] = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    nama: "Fulan Alif (Contoh)",
    namaAyahWali: "Fulan Ayah Alif (Contoh)",
    kelasId: "a0000000-0000-4000-8000-000000000001",
    nis: "CONTOH-001",
    statusAktif: true,
  },
  {
    id: "d0000000-0000-4000-8000-000000000002",
    nama: "Fulan Bima (Contoh)",
    namaAyahWali: "Fulan Ayah Bima (Contoh)",
    kelasId: "a0000000-0000-4000-8000-000000000001",
    nis: "CONTOH-002",
    statusAktif: true,
  },
  {
    id: "d0000000-0000-4000-8000-000000000003",
    nama: "Fulan Candra (Contoh)",
    namaAyahWali: "Fulan Ayah Candra (Contoh)",
    kelasId: "a0000000-0000-4000-8000-000000000002",
    nis: "CONTOH-003",
    statusAktif: true,
  },
  {
    id: "d0000000-0000-4000-8000-000000000004",
    nama: "Fulan Danu (Contoh)",
    namaAyahWali: "Fulan Ayah Danu (Contoh)",
    kelasId: "a0000000-0000-4000-8000-000000000002",
    nis: "CONTOH-004",
    statusAktif: true,
  },
  {
    id: "d0000000-0000-4000-8000-000000000005",
    nama: "Fulan Eko (Contoh)",
    namaAyahWali: "Fulan Ayah Eko (Contoh)",
    kelasId: "a0000000-0000-4000-8000-000000000003",
    nis: "CONTOH-005",
    statusAktif: true,
  },
  {
    id: "d0000000-0000-4000-8000-000000000006",
    nama: "Fulan Fajar (Contoh)",
    namaAyahWali: "Fulan Ayah Fajar (Contoh)",
    kelasId: "a0000000-0000-4000-8000-000000000003",
    nis: "CONTOH-006",
    statusAktif: true,
  },
];

/**
 * Jadwal sesi contoh. Mapel diniyyah sengaja kosong (null): daftar mapel
 * resmi masih menunggu PDF jadwal diniyyah dari user.
 */
export const JADWAL_CONTOH: JadwalContoh[] = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    jenis: "hifzh",
    jamLabel: "Ba'da Subuh",
    mapel: null,
  },
  {
    id: "c0000000-0000-4000-8000-000000000002",
    jenis: "diniyyah",
    jamLabel: "10.30-11.30",
    mapel: null,
  },
  {
    id: "c0000000-0000-4000-8000-000000000003",
    jenis: "diniyyah",
    jamLabel: "Ba'da Zhuhur",
    mapel: null,
  },
  {
    id: "c0000000-0000-4000-8000-000000000004",
    jenis: "diniyyah",
    jamLabel: "Ba'da Ashr",
    mapel: null,
  },
  {
    id: "c0000000-0000-4000-8000-000000000005",
    jenis: "diniyyah",
    jamLabel: "Ba'da Maghrib",
    mapel: null,
  },
  {
    id: "c0000000-0000-4000-8000-000000000006",
    jenis: "olahraga",
    jamLabel: "Ahad Pagi",
    mapel: null,
  },
  {
    id: "c0000000-0000-4000-8000-000000000007",
    jenis: "olahraga",
    jamLabel: "Kamis Pagi",
    mapel: null,
  },
];
