/**
 * Logika murni pengisian status kehadiran massal (halaman Kehadiran &
 * Olahraga) — perbaikan audit UI Fase 1 (3 Nov 2026).
 *
 * Perilaku lama "Tandai semua Hadir" MENIMPA status yang sudah dipilih
 * pengguna (Sakit/Izin/Alpa bisa berubah menjadi Hadir tanpa disengaja).
 * Fungsi di sini memisahkan dua tindakan dengan jelas:
 * - isiKosongSebagaiHadir: HANYA mengisi santri yang statusnya masih
 *   kosong; pilihan yang sudah ada tidak pernah berubah.
 * - timpaSemuaJadiHadir: menimpa semua — hanya dijalankan setelah
 *   konfirmasi pengguna, dengan hitungTertimpa() untuk menyebut jumlah
 *   status yang akan berubah di dialog konfirmasi.
 *
 * File ini murni (tanpa React/DOM) agar bisa diuji langsung dengan node.
 */
import type { StatusKehadiran } from "@/lib/data/kehadiran";

export type PetaStatus = Record<string, StatusKehadiran>;

/**
 * Salinan peta status dengan santri yang masih kosong diisi "hadir".
 * Santri di luar `daftarId` (mis. tersembunyi filter kelas) tidak
 * disentuh; status yang sudah terpilih TIDAK pernah berubah.
 */
export function isiKosongSebagaiHadir(
  pilihan: PetaStatus,
  daftarId: string[],
): PetaStatus {
  const baru: PetaStatus = { ...pilihan };
  for (const id of daftarId) {
    if (!baru[id]) baru[id] = "hadir";
  }
  return baru;
}

/**
 * Salinan peta status dengan SEMUA santri di `daftarId` menjadi
 * "hadir", menimpa pilihan yang sudah ada. Hanya untuk tindakan
 * "Timpa semua jadi Hadir" yang sudah dikonfirmasi pengguna.
 */
export function timpaSemuaJadiHadir(
  pilihan: PetaStatus,
  daftarId: string[],
): PetaStatus {
  const baru: PetaStatus = { ...pilihan };
  for (const id of daftarId) baru[id] = "hadir";
  return baru;
}

/**
 * Jumlah status yang AKAN BERUBAH bila penimpaan "semua jadi Hadir"
 * dijalankan: santri di `daftarId` yang sudah punya status selain
 * "hadir". Santri yang masih kosong tidak dihitung tertimpa (mereka
 * diisi, bukan ditimpa), dan yang sudah "hadir" tidak berubah.
 */
export function hitungTertimpa(
  pilihan: PetaStatus,
  daftarId: string[],
): number {
  let n = 0;
  for (const id of daftarId) {
    const status = pilihan[id];
    if (status && status !== "hadir") n += 1;
  }
  return n;
}

/** Jumlah santri di `daftarId` yang statusnya masih kosong. */
export function hitungKosong(pilihan: PetaStatus, daftarId: string[]): number {
  let n = 0;
  for (const id of daftarId) {
    if (!pilihan[id]) n += 1;
  }
  return n;
}
