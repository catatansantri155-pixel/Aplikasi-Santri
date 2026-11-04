/**
 * Helper tanggal bersama (Masehi ringkas + Hijriah).
 *
 * HIJRIAH TANPA NAMA BULAN DARI Intl: di sebagian perangkat (terlihat
 * di HP user, 4 Nov 2026) Intl.DateTimeFormat dengan kalender Islam
 * dan month:"long" mengembalikan nama bulan MASEHI yang salah —
 * tampil "25 Mei 1448 SM H". Karena itu tanggal Hijriah di sini
 * diambil dari BAGIAN ANGKA (day/month/year numeric, kalender
 * islamic-umalqura) lalu nama bulannya dipetakan sendiri dari tabel
 * di bawah. Angka hari/bulan/tahun dari Intl terbukti benar; yang
 * rusak hanya label nama bulan & eranya.
 */

export const NAMA_BULAN_HIJRIAH = [
  "Muharram",
  "Safar",
  "Rabiulawal",
  "Rabiulakhir",
  "Jumadilawal",
  "Jumadilakhir",
  "Rajab",
  "Syakban",
  "Ramadan",
  "Syawal",
  "Zulkaidah",
  "Zulhijah",
] as const;

interface BagianHijriah {
  hari: number;
  /** 1–12 */
  bulan: number;
  tahun: number;
}

/** Bagian angka tanggal Hijriah; null bila Intl/kalender tak tersedia. */
export function bagianHijriah(tanggal: Date): BagianHijriah | null {
  for (const kalender of ["islamic-umalqura", "islamic"]) {
    try {
      const parts = new Intl.DateTimeFormat(`en-u-ca-${kalender}`, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }).formatToParts(tanggal);
      const ambil = (tipe: string) =>
        Number(parts.find((p) => p.type === tipe)?.value);
      const hari = ambil("day");
      const bulan = ambil("month");
      const tahun = ambil("year");
      if (hari >= 1 && bulan >= 1 && bulan <= 12 && tahun > 0) {
        return { hari, bulan, tahun };
      }
    } catch {
      // coba kalender berikutnya
    }
  }
  return null;
}

/** "24 Jumadilawal 1448 H" — kosong bila gagal dihitung. */
export function formatHijriahRingkas(tanggal: Date = new Date()): string {
  const b = bagianHijriah(tanggal);
  if (!b) return "";
  return `${b.hari} ${NAMA_BULAN_HIJRIAH[b.bulan - 1]} ${b.tahun} H`;
}

/** "Rabu, 24 Jumadilawal 1448 H" — untuk kolom Hijriah form setoran. */
export function formatHijriahLengkap(tanggal: Date): string {
  const b = bagianHijriah(tanggal);
  if (!b) return "";
  const namaHari = tanggal.toLocaleDateString("id-ID", { weekday: "long" });
  return `${namaHari}, ${b.hari} ${NAMA_BULAN_HIJRIAH[b.bulan - 1]} ${b.tahun} H`;
}

/** "Rab, 4 Nov 2026" — tanggal Masehi ringkas untuk kepala halaman. */
export function formatTanggalRingkas(tanggal: Date = new Date()): string {
  return tanggal.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** ISO lokal hari ini (YYYY-MM-DD) tanpa geser zona waktu UTC. */
export function tanggalIsoHariIni(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}
