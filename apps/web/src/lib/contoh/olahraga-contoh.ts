/**
 * DATA CONTOH (FIKSI) — sesi olahraga & kehadiran olahraga.
 *
 * Dipakai HANYA bila env Supabase belum terisi (lihat
 * src/lib/data/olahraga.ts). Seluruh baris menunjuk santri contoh dari
 * santri-contoh.ts — tidak ada data asli di sini.
 *
 * Penyimpanan contoh bersifat SEMENTARA di memori modul ini: sesi &
 * kehadiran yang dibuat dari halaman olahraga akan terlihat selama
 * sesi halaman hidup, dan hilang saat halaman dimuat ulang dari awal
 * (full reload). Di database asli, semua ini persisten di tabel
 * `olahraga_sesi` & `olahraga_kehadiran` dan dijaga RLS staf
 * (lihat supabase/migrations/0003_rls.sql).
 *
 * Tanggal sesi contoh mengikuti jadwal rutin olahraga pondok: Ahad
 * pagi dan Kamis pagi.
 */

export type StatusKehadiranOlahragaContoh =
  | "hadir"
  | "sakit"
  | "izin"
  | "alpa";

export interface SesiOlahragaContoh {
  id: string;
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
  kegiatan: string;
  catatan: string | null;
  pengisiNama: string;
}

export interface KehadiranOlahragaContoh {
  id: string;
  sesiId: string;
  santriId: string;
  status: StatusKehadiranOlahragaContoh;
}

const ID_SANTRI = [
  "d0000000-0000-4000-8000-000000000001",
  "d0000000-0000-4000-8000-000000000002",
  "d0000000-0000-4000-8000-000000000003",
  "d0000000-0000-4000-8000-000000000004",
  "d0000000-0000-4000-8000-000000000005",
  "d0000000-0000-4000-8000-000000000006",
];

const PENGISI_OLAHRAGA = "Ust. Musyrif Contoh";

function barisKehadiranSesi(
  sesiId: string,
  statusPerSantri: StatusKehadiranOlahragaContoh[],
): KehadiranOlahragaContoh[] {
  return ID_SANTRI.map((santriId, i) => ({
    id: `${sesiId}-hadir-${i + 1}`,
    sesiId,
    santriId,
    status: statusPerSantri[i],
  }));
}

const SESI_AWAL: SesiOlahragaContoh[] = [
  {
    id: "olahraga-contoh-20261101",
    tanggal: "2026-11-01", // Ahad
    kegiatan: "Senam pagi & lari keliling lapangan (Contoh)",
    catatan: "Sesi Ahad pagi (contoh).",
    pengisiNama: PENGISI_OLAHRAGA,
  },
  {
    id: "olahraga-contoh-20261029",
    tanggal: "2026-10-29", // Kamis
    kegiatan: "Sepak bola mini antar kelas (Contoh)",
    catatan: null,
    pengisiNama: PENGISI_OLAHRAGA,
  },
  {
    id: "olahraga-contoh-20261025",
    tanggal: "2026-10-25", // Ahad
    kegiatan: "Bulu tangkis & tenis meja (Contoh)",
    catatan: null,
    pengisiNama: "Ust. Penyimak Contoh",
  },
];

const KEHADIRAN_AWAL: KehadiranOlahragaContoh[] = [
  ...barisKehadiranSesi("olahraga-contoh-20261101", [
    "hadir",
    "hadir",
    "hadir",
    "sakit",
    "hadir",
    "hadir",
  ]),
  ...barisKehadiranSesi("olahraga-contoh-20261029", [
    "hadir",
    "hadir",
    "izin",
    "hadir",
    "hadir",
    "hadir",
  ]),
  ...barisKehadiranSesi("olahraga-contoh-20261025", [
    "hadir",
    "alpa",
    "hadir",
    "hadir",
    "hadir",
    "sakit",
  ]),
];

/* ------------------------------------------------------------------ */
/* Gudang contoh di memori — hanya dipakai lapisan data saat mode      */
/* contoh. JANGAN impor file ini langsung dari halaman; lewat          */
/* src/lib/data/olahraga.ts.                                           */
/* ------------------------------------------------------------------ */

const gudangSesi: SesiOlahragaContoh[] = [...SESI_AWAL];
const gudangKehadiran: KehadiranOlahragaContoh[] = [...KEHADIRAN_AWAL];
let penomoranSesi = 0;
let penomoranKehadiran = 0;

export function semuaSesiOlahragaContoh(): SesiOlahragaContoh[] {
  return [...gudangSesi];
}

export function sesiOlahragaContohPadaTanggal(
  tanggal: string,
): SesiOlahragaContoh | undefined {
  return gudangSesi.find((s) => s.tanggal === tanggal);
}

export function tambahSesiOlahragaContoh(
  sesi: SesiOlahragaContoh,
): SesiOlahragaContoh {
  gudangSesi.push(sesi);
  return sesi;
}

export function idSesiOlahragaContohBaru(): string {
  penomoranSesi += 1;
  return `olahraga-contoh-baru-${penomoranSesi}`;
}

export function ubahSesiOlahragaContoh(
  id: string,
  masukan: { tanggal: string; kegiatan: string; catatan: string | null },
): SesiOlahragaContoh | undefined {
  const indeks = gudangSesi.findIndex((s) => s.id === id);
  if (indeks < 0) return undefined;
  gudangSesi[indeks] = { ...gudangSesi[indeks], ...masukan };
  return gudangSesi[indeks];
}

/** Hapus sesi beserta baris kehadirannya (meniru ON DELETE CASCADE). */
export function hapusSesiOlahragaContoh(id: string): boolean {
  const indeks = gudangSesi.findIndex((s) => s.id === id);
  if (indeks < 0) return false;
  gudangSesi.splice(indeks, 1);
  for (let i = gudangKehadiran.length - 1; i >= 0; i -= 1) {
    if (gudangKehadiran[i].sesiId === id) gudangKehadiran.splice(i, 1);
  }
  return true;
}

export function semuaKehadiranOlahragaContoh(): KehadiranOlahragaContoh[] {
  return [...gudangKehadiran];
}

export function kehadiranOlahragaContohSesi(
  sesiId: string,
): KehadiranOlahragaContoh[] {
  return gudangKehadiran.filter((k) => k.sesiId === sesiId);
}

/** Tambah/perbarui baris (kunci unik contoh: sesi + santri). */
export function simpanKehadiranOlahragaContoh(
  sesiId: string,
  santriId: string,
  status: StatusKehadiranOlahragaContoh,
): KehadiranOlahragaContoh {
  const indeks = gudangKehadiran.findIndex(
    (k) => k.sesiId === sesiId && k.santriId === santriId,
  );
  if (indeks >= 0) {
    gudangKehadiran[indeks] = { ...gudangKehadiran[indeks], status };
    return gudangKehadiran[indeks];
  }
  penomoranKehadiran += 1;
  const baris: KehadiranOlahragaContoh = {
    id: `olahraga-hadir-contoh-baru-${penomoranKehadiran}`,
    sesiId,
    santriId,
    status,
  };
  gudangKehadiran.push(baris);
  return baris;
}
