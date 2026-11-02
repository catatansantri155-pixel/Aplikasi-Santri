/**
 * DATA CONTOH (FIKSI) — kehadiran & log revisi kehadiran.
 *
 * Dipakai HANYA bila env Supabase belum terisi (lihat
 * src/lib/data/kehadiran.ts). Seluruh baris menunjuk santri contoh dari
 * santri-contoh.ts — tidak ada data asli di sini.
 *
 * Penyimpanan contoh bersifat SEMENTARA di memori modul ini: simpan &
 * revisi dari halaman kehadiran akan terlihat selama sesi halaman hidup,
 * dan hilang saat halaman dimuat ulang dari awal (full reload).
 * Di database asli, semua ini persisten dan dijaga RLS + prosedur
 * revisi_kehadiran() (lihat supabase/migrations/0003_rls.sql).
 */

export type StatusKehadiranContoh = "hadir" | "sakit" | "izin" | "alpa";
export type SesiKehadiranContoh = "hifzh" | "diniyyah";

export interface KehadiranContoh {
  id: string;
  santriId: string;
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
  sesiJenis: SesiKehadiranContoh;
  jadwalId: string | null;
  jamLabel: string;
  status: StatusKehadiranContoh;
  pengisiNama: string;
}

export interface LogRevisiContoh {
  id: string;
  kehadiranId: string;
  statusLama: StatusKehadiranContoh;
  statusBaru: StatusKehadiranContoh;
  alasan: string;
  diubahOlehNama: string;
  /** ISO datetime */
  waktu: string;
}

const ID_SANTRI = [
  "d0000000-0000-4000-8000-000000000001",
  "d0000000-0000-4000-8000-000000000002",
  "d0000000-0000-4000-8000-000000000003",
  "d0000000-0000-4000-8000-000000000004",
  "d0000000-0000-4000-8000-000000000005",
  "d0000000-0000-4000-8000-000000000006",
];

const JADWAL_HIFZH_SUBUH = "c0000000-0000-4000-8000-000000000001";
const JADWAL_DINIYYAH_1030 = "c0000000-0000-4000-8000-000000000002";
const JADWAL_DINIYYAH_ZHUHUR = "c0000000-0000-4000-8000-000000000003";

const PENGISI_HIFZH = "Ust. Penyimak Contoh";
const PENGISI_DINIYYAH = "Ust. Diniyyah Contoh";

/** Susun baris contoh untuk satu sesi: status per santri sesuai urutan ID_SANTRI. */
function barisSesi(
  awalan: string,
  tanggal: string,
  sesiJenis: SesiKehadiranContoh,
  jadwalId: string,
  jamLabel: string,
  pengisiNama: string,
  statusPerSantri: StatusKehadiranContoh[],
): KehadiranContoh[] {
  return ID_SANTRI.map((santriId, i) => ({
    id: `${awalan}-${i + 1}`,
    santriId,
    tanggal,
    sesiJenis,
    jadwalId,
    jamLabel,
    status: statusPerSantri[i],
    pengisiNama,
  }));
}

/**
 * Isi awal gudang contoh. Satu baris (Fulan Fajar, diniyyah 2026-11-02)
 * sengaja berstatus "hadir" sebagai HASIL REVISI admin — jejaknya ada di
 * LOG_REVISI_CONTOH di bawah, meniru perilaku log revisi asli.
 */
const KEHADIRAN_AWAL: KehadiranContoh[] = [
  ...barisSesi(
    "hadir-contoh-20261102-hifzh",
    "2026-11-02",
    "hifzh",
    JADWAL_HIFZH_SUBUH,
    "Ba'da Subuh",
    PENGISI_HIFZH,
    ["hadir", "hadir", "sakit", "hadir", "izin", "hadir"],
  ),
  ...barisSesi(
    "hadir-contoh-20261102-diniyyah",
    "2026-11-02",
    "diniyyah",
    JADWAL_DINIYYAH_1030,
    "10.30-11.30",
    PENGISI_DINIYYAH,
    ["hadir", "hadir", "sakit", "hadir", "hadir", "hadir"],
  ),
  ...barisSesi(
    "hadir-contoh-20261101-hifzh",
    "2026-11-01",
    "hifzh",
    JADWAL_HIFZH_SUBUH,
    "Ba'da Subuh",
    PENGISI_HIFZH,
    ["hadir", "hadir", "hadir", "izin", "hadir", "hadir"],
  ),
  ...barisSesi(
    "hadir-contoh-20261029-diniyyah",
    "2026-10-29",
    "diniyyah",
    JADWAL_DINIYYAH_ZHUHUR,
    "Ba'da Zhuhur",
    PENGISI_DINIYYAH,
    ["hadir", "izin", "hadir", "hadir", "sakit", "hadir"],
  ),
  ...barisSesi(
    "hadir-contoh-20261028-hifzh",
    "2026-10-28",
    "hifzh",
    JADWAL_HIFZH_SUBUH,
    "Ba'da Subuh",
    PENGISI_HIFZH,
    ["hadir", "hadir", "alpa", "hadir", "hadir", "izin"],
  ),
];

const LOG_REVISI_AWAL: LogRevisiContoh[] = [
  {
    id: "log-contoh-1",
    kehadiranId: "hadir-contoh-20261102-diniyyah-6",
    statusLama: "alpa",
    statusBaru: "hadir",
    alasan:
      "Santri ternyata hadir, terlambat masuk kelas (catatan contoh revisi admin).",
    diubahOlehNama: "Admin Contoh",
    waktu: "2026-11-02T04:15:00.000Z",
  },
];

/* ------------------------------------------------------------------ */
/* Gudang contoh di memori — hanya dipakai lapisan data saat mode      */
/* contoh. JANGAN impor file ini langsung dari halaman; lewat          */
/* src/lib/data/kehadiran.ts.                                          */
/* ------------------------------------------------------------------ */

const gudangKehadiran: KehadiranContoh[] = [...KEHADIRAN_AWAL];
const gudangLogRevisi: LogRevisiContoh[] = [...LOG_REVISI_AWAL];
let penomoranContoh = 0;

export function semuaKehadiranContoh(): KehadiranContoh[] {
  return [...gudangKehadiran];
}

export function semuaLogRevisiContoh(): LogRevisiContoh[] {
  return [...gudangLogRevisi];
}

/** Tambah/perbarui baris (kunci unik contoh: santri + tanggal + sesi + jadwal). */
export function simpanKehadiranContoh(baris: KehadiranContoh): KehadiranContoh {
  const indeks = gudangKehadiran.findIndex(
    (b) =>
      b.santriId === baris.santriId &&
      b.tanggal === baris.tanggal &&
      b.sesiJenis === baris.sesiJenis &&
      b.jadwalId === baris.jadwalId,
  );
  if (indeks >= 0) {
    // Perbarui isi baris lama, tapi PERTAHANKAN id lamanya agar rujukan
    // log revisi ke baris ini tidak putus.
    gudangKehadiran[indeks] = {
      ...gudangKehadiran[indeks],
      ...baris,
      id: gudangKehadiran[indeks].id,
    };
    return gudangKehadiran[indeks];
  }
  gudangKehadiran.push(baris);
  return baris;
}

export function idKehadiranContohBaru(): string {
  penomoranContoh += 1;
  return `hadir-contoh-baru-${penomoranContoh}`;
}

/** Terapkan revisi contoh: ubah status baris + catat log (meniru RPC asli). */
export function revisiKehadiranContoh(
  kehadiranId: string,
  statusBaru: StatusKehadiranContoh,
  alasan: string,
  diubahOlehNama: string,
): LogRevisiContoh {
  const baris = gudangKehadiran.find((b) => b.id === kehadiranId);
  if (!baris) {
    throw new Error("Baris kehadiran contoh tidak ditemukan.");
  }
  if (baris.status === statusBaru) {
    throw new Error("Status baru sama dengan status lama; tidak ada yang direvisi.");
  }
  const log: LogRevisiContoh = {
    id: `log-contoh-baru-${gudangLogRevisi.length + 1}`,
    kehadiranId,
    statusLama: baris.status,
    statusBaru,
    alasan,
    diubahOlehNama,
    waktu: new Date().toISOString(),
  };
  baris.status = statusBaru;
  gudangLogRevisi.push(log);
  return log;
}
