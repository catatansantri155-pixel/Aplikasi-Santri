/**
 * Lapisan data — OLAHRAGA (Tahap 2, modul 5 lanjutan).
 *
 * POLA WAJIB (sama seperti lapisan data lain):
 * - Bila env Supabase BELUM terisi, semua fungsi memakai DATA CONTOH
 *   FIKSI dari src/lib/contoh/olahraga-contoh.ts (disimpan sementara
 *   di memori; hilang saat muat ulang penuh) dan mengembalikan
 *   `sumberContoh: true`.
 * - Bila env terisi, fungsi memakai tabel `olahraga_sesi` dan
 *   `olahraga_kehadiran` lewat klien Supabase
 *   (src/lib/supabase/client.ts). RLS di database: sesi hanya bisa
 *   dibuat staf dengan pengisi_id = akun yang login; kehadiran hanya
 *   bisa ditulis staf; wali hanya membaca kehadiran anaknya sendiri.
 *
 * Skema yang dipakai (supabase/migrations/0001_schema.sql):
 * - olahraga_sesi: id, tanggal (UNIK — satu sesi per tanggal),
 *   kegiatan, catatan (boleh kosong), pengisi_id, created_at,
 *   updated_at. TIDAK ada kolom hari/pelatih: hari diturunkan dari
 *   tanggal di sini, pengisi memakai pengisi_id.
 * - olahraga_kehadiran: id, olahraga_sesi_id, santri_id, status
 *   (enum status_kehadiran), created_at; unik (olahraga_sesi_id,
 *   santri_id). TIDAK ada kolom keterangan/pengisi pada tabel ini.
 *
 * Jadwal rutin olahraga menurut spesifikasi user: AHAD PAGI dan
 * KAMIS PAGI. Tanggal sesi tetap bisa dipilih bebas di formulir.
 * Belum ada keputusan user apakah olahraga juga DINILAI atau hanya
 * kehadiran + kegiatan — lapisan ini memang hanya mengelola sesi &
 * kehadiran, tanpa tabel/kolom nilai apa pun.
 *
 * Halaman TIDAK boleh mengakses tabel / gudang contoh secara langsung;
 * selalu lewat fungsi di file ini.
 */
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung, type HasilSantri } from "@/lib/data/santri";
import {
  ambilProfilSaya,
  type StatusKehadiran,
} from "@/lib/data/kehadiran";
import {
  idSesiOlahragaContohBaru,
  kehadiranOlahragaContohSesi,
  semuaKehadiranOlahragaContoh,
  semuaSesiOlahragaContoh,
  sesiOlahragaContohPadaTanggal,
  simpanKehadiranOlahragaContoh,
  tambahSesiOlahragaContoh,
} from "@/lib/contoh/olahraga-contoh";

export type { StatusKehadiran };

/* ------------------------------------------------------------------ */
/* Hari dari tanggal                                                    */
/* ------------------------------------------------------------------ */

/** Nama hari konvensi ISO: 1 = Senin ... 7 = Ahad. */
export const NAMA_HARI: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Ahad",
};

/** Hari (ISO 1–7 + label) yang diturunkan dari tanggal ISO YYYY-MM-DD. */
export function hariDariTanggal(tanggal: string): {
  iso: number;
  label: string;
} {
  const d = new Date(`${tanggal}T00:00:00`);
  // getDay(): 0 = Ahad ... 6 = Sabtu → ISO: Ahad = 7, lainnya sama.
  const iso = d.getDay() === 0 ? 7 : d.getDay();
  return { iso, label: NAMA_HARI[iso] ?? "-" };
}

/** Nama bulan Indonesia, indeks 0 = Januari. */
const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * "Ahad, 1 November 2026" dari tanggal ISO YYYY-MM-DD.
 * Disusun manual (bukan Intl) agar nama hari konsisten memakai
 * sebutan pondok "Ahad" — Intl id-ID menuliskannya "Minggu" — dan
 * hasil server & klien selalu sama.
 */
export function formatTanggalPanjang(tanggal: string): string {
  const d = new Date(`${tanggal}T00:00:00`);
  if (Number.isNaN(d.getTime())) return tanggal;
  const { label } = hariDariTanggal(tanggal);
  return `${label}, ${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** True bila tanggal adalah hari jadwal rutin olahraga (Ahad/Kamis). */
export function apakahHariOlahragaRutin(tanggal: string): boolean {
  const { iso } = hariDariTanggal(tanggal);
  return iso === 7 || iso === 4;
}

/* ------------------------------------------------------------------ */
/* Tipe                                                                 */
/* ------------------------------------------------------------------ */

export interface SesiOlahraga {
  id: string;
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
  /** Hari turunan dari tanggal, konvensi ISO (1 = Senin ... 7 = Ahad). */
  hariIso: number;
  hariLabel: string;
  kegiatan: string;
  catatan: string | null;
  pengisiNama: string | null;
  /** Jumlah santri berstatus hadir pada sesi ini. */
  jumlahHadir: number;
  /** Jumlah santri yang sudah diberi status pada sesi ini. */
  jumlahTerisi: number;
}

export interface BarisKehadiranOlahraga {
  id: string;
  santriId: string;
  status: StatusKehadiran;
}

export interface PermintaanSesiBaru {
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
  kegiatan: string;
  catatan?: string | null;
}

export interface EntriKehadiranOlahraga {
  santriId: string;
  status: StatusKehadiran;
}

/* ------------------------------------------------------------------ */
/* Membaca daftar sesi                                                  */
/* ------------------------------------------------------------------ */

function lengkapiSesi(
  dasar: Omit<SesiOlahraga, "hariIso" | "hariLabel">,
): SesiOlahraga {
  const hari = hariDariTanggal(dasar.tanggal);
  return { ...dasar, hariIso: hari.iso, hariLabel: hari.label };
}

/** Daftar sesi olahraga, tanggal terbaru dulu, lengkap dengan hitungan hadir. */
export async function ambilDaftarSesi(): Promise<
  HasilSantri<SesiOlahraga[]>
> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: sesi & hitungan dari gudang contoh di memori.
    const semuaKehadiran = semuaKehadiranOlahragaContoh();
    const data = semuaSesiOlahragaContoh()
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .map((s) => {
        const baris = semuaKehadiran.filter((k) => k.sesiId === s.id);
        return lengkapiSesi({
          id: s.id,
          tanggal: s.tanggal,
          kegiatan: s.kegiatan,
          catatan: s.catatan,
          pengisiNama: s.pengisiNama,
          jumlahHadir: baris.filter((k) => k.status === "hadir").length,
          jumlahTerisi: baris.length,
        });
      });
    return { data, sumberContoh: true };
  }

  const supabase = buatKlienBrowser();
  const { data: sesiDb, error: galatSesi } = await supabase
    .from("olahraga_sesi")
    .select(
      "id, tanggal, kegiatan, catatan, pengisi:pengisi_id ( nama )",
    )
    .order("tanggal", { ascending: false });
  if (galatSesi) {
    throw new Error(`Gagal membaca sesi olahraga: ${galatSesi.message}`);
  }
  const barisSesi = sesiDb as unknown as {
    id: string;
    tanggal: string;
    kegiatan: string;
    catatan: string | null;
    pengisi: { nama: string } | null;
  }[];

  // Hitungan kehadiran per sesi diagregasi di klien dari satu kueri.
  const hitungan = new Map<string, { hadir: number; terisi: number }>();
  if (barisSesi.length > 0) {
    const { data: hadirDb, error: galatHadir } = await supabase
      .from("olahraga_kehadiran")
      .select("olahraga_sesi_id, status")
      .in(
        "olahraga_sesi_id",
        barisSesi.map((s) => s.id),
      );
    if (galatHadir) {
      throw new Error(
        `Gagal membaca kehadiran olahraga: ${galatHadir.message}`,
      );
    }
    for (const k of hadirDb as {
      olahraga_sesi_id: string;
      status: StatusKehadiran;
    }[]) {
      const h = hitungan.get(k.olahraga_sesi_id) ?? { hadir: 0, terisi: 0 };
      h.terisi += 1;
      if (k.status === "hadir") h.hadir += 1;
      hitungan.set(k.olahraga_sesi_id, h);
    }
  }

  return {
    data: barisSesi.map((s) =>
      lengkapiSesi({
        id: s.id,
        tanggal: s.tanggal,
        kegiatan: s.kegiatan,
        catatan: s.catatan,
        pengisiNama: s.pengisi?.nama ?? null,
        jumlahHadir: hitungan.get(s.id)?.hadir ?? 0,
        jumlahTerisi: hitungan.get(s.id)?.terisi ?? 0,
      }),
    ),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Membuat sesi baru                                                    */
/* ------------------------------------------------------------------ */

/**
 * Buat sesi olahraga baru. Satu tanggal hanya boleh punya satu sesi
 * (unik di database); hari diturunkan dari tanggal. Pengisi selalu
 * pengguna yang sedang login (dijaga juga oleh RLS).
 */
export async function buatSesiBaru(
  permintaan: PermintaanSesiBaru,
): Promise<HasilSantri<SesiOlahraga>> {
  const tanggal = permintaan.tanggal.trim();
  const kegiatan = permintaan.kegiatan.trim();
  const catatan = permintaan.catatan?.trim() || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    throw new Error("Tanggal sesi wajib dipilih.");
  }
  if (!kegiatan) {
    throw new Error("Kegiatan sesi wajib diisi.");
  }

  const profil = await ambilProfilSaya();

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori (hilang saat muat ulang).
    if (sesiOlahragaContohPadaTanggal(tanggal)) {
      throw new Error(
        `Sudah ada sesi olahraga pada tanggal ${tanggal}; satu tanggal hanya boleh punya satu sesi.`,
      );
    }
    const sesi = tambahSesiOlahragaContoh({
      id: idSesiOlahragaContohBaru(),
      tanggal,
      kegiatan,
      catatan,
      pengisiNama: profil.data.nama,
    });
    return {
      data: lengkapiSesi({
        id: sesi.id,
        tanggal: sesi.tanggal,
        kegiatan: sesi.kegiatan,
        catatan: sesi.catatan,
        pengisiNama: sesi.pengisiNama,
        jumlahHadir: 0,
        jumlahTerisi: 0,
      }),
      sumberContoh: true,
    };
  }

  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("olahraga_sesi")
    .insert({
      tanggal,
      kegiatan,
      catatan,
      pengisi_id: profil.data.id,
    })
    .select("id, tanggal, kegiatan, catatan")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `Sudah ada sesi olahraga pada tanggal ${tanggal}; satu tanggal hanya boleh punya satu sesi.`,
      );
    }
    throw new Error(`Gagal membuat sesi olahraga: ${error.message}`);
  }
  const baris = data as {
    id: string;
    tanggal: string;
    kegiatan: string;
    catatan: string | null;
  };
  return {
    data: lengkapiSesi({
      id: baris.id,
      tanggal: baris.tanggal,
      kegiatan: baris.kegiatan,
      catatan: baris.catatan,
      pengisiNama: profil.data.nama,
      jumlahHadir: 0,
      jumlahTerisi: 0,
    }),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Kehadiran per sesi                                                   */
/* ------------------------------------------------------------------ */

/** Baris kehadiran yang sudah tersimpan untuk satu sesi. */
export async function ambilKehadiranSesi(
  sesiId: string,
): Promise<HasilSantri<BarisKehadiranOlahraga[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: saring gudang contoh di memori.
    return {
      data: kehadiranOlahragaContohSesi(sesiId).map((k) => ({
        id: k.id,
        santriId: k.santriId,
        status: k.status,
      })),
      sumberContoh: true,
    };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("olahraga_kehadiran")
    .select("id, santri_id, status")
    .eq("olahraga_sesi_id", sesiId)
    .order("santri_id", { ascending: true });
  if (error) {
    throw new Error(`Gagal membaca kehadiran sesi: ${error.message}`);
  }
  return {
    data: (
      data as { id: string; santri_id: string; status: StatusKehadiran }[]
    ).map((k) => ({ id: k.id, santriId: k.santri_id, status: k.status })),
    sumberContoh: false,
  };
}

/**
 * Simpan kehadiran satu sesi untuk banyak santri sekaligus.
 * Di database memakai upsert pada kunci unik (olahraga_sesi_id,
 * santri_id). Tabel olahraga_kehadiran tidak punya kolom pengisi —
 * hak tulisnya dijaga RLS staf.
 */
export async function simpanKehadiranSesi(
  sesiId: string,
  entri: EntriKehadiranOlahraga[],
): Promise<HasilSantri<{ tersimpan: number }>> {
  if (entri.length === 0) {
    throw new Error("Belum ada santri yang diberi status kehadiran.");
  }

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori (hilang saat muat ulang).
    for (const e of entri) {
      simpanKehadiranOlahragaContoh(sesiId, e.santriId, e.status);
    }
    return { data: { tersimpan: entri.length }, sumberContoh: true };
  }

  const supabase = buatKlienBrowser();
  const { error } = await supabase.from("olahraga_kehadiran").upsert(
    entri.map((e) => ({
      olahraga_sesi_id: sesiId,
      santri_id: e.santriId,
      status: e.status,
    })),
    { onConflict: "olahraga_sesi_id,santri_id" },
  );
  if (error) {
    throw new Error(`Gagal menyimpan kehadiran olahraga: ${error.message}`);
  }
  return { data: { tersimpan: entri.length }, sumberContoh: false };
}
