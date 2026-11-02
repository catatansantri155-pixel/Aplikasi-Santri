/**
 * Lapisan data — KEHADIRAN (Jalur C, Tahap 2).
 *
 * POLA WAJIB tahap ini (data contoh):
 * - Bila env Supabase BELUM terisi, semua fungsi memakai DATA CONTOH FIKSI
 *   dari src/lib/contoh/ (disimpan sementara di memori; hilang saat muat
 *   ulang penuh) dan mengembalikan `sumberContoh: true`.
 * - Bila env terisi, fungsi memakai tabel `kehadiran`, `jadwal_sesi`, dan
 *   RPC `revisi_kehadiran` lewat klien Supabase
 *   (src/lib/supabase/client.ts). Perubahan status TIDAK PERNAH lewat
 *   update tabel langsung — di database hanya prosedur revisi_kehadiran()
 *   (khusus admin, alasan wajib, menulis log) yang boleh mengubah status;
 *   penjaga itu ditegakkan pemicu di 0003_rls.sql, bukan di sini.
 *
 * Halaman TIDAK boleh mengakses tabel / gudang contoh secara langsung;
 * selalu lewat fungsi di file ini.
 */
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung, type HasilSantri } from "@/lib/data/santri";
import { JADWAL_CONTOH } from "@/lib/contoh/santri-contoh";
import {
  idKehadiranContohBaru,
  revisiKehadiranContoh,
  semuaKehadiranContoh,
  semuaLogRevisiContoh,
  simpanKehadiranContoh,
  type KehadiranContoh,
} from "@/lib/contoh/kehadiran-contoh";

/* Peran mengikuti enum `peran` di database (0001_schema.sql).
   src/lib/peran.ts sudah diselaraskan induk pada 2 Nov 2026 (nilai "wali",
   sebelumnya "orang_tua") sehingga keduanya kini sama. */
export type PeranDb =
  | "admin"
  | "pengajar_hifzh"
  | "pengajar_diniyyah"
  | "musyrif"
  | "wali";

export type StatusKehadiran = "hadir" | "sakit" | "izin" | "alpa";
export type SesiKehadiran = "hifzh" | "diniyyah";

export const STATUS_KEHADIRAN: StatusKehadiran[] = [
  "hadir",
  "sakit",
  "izin",
  "alpa",
];

export const LABEL_STATUS: Record<StatusKehadiran, string> = {
  hadir: "Hadir",
  sakit: "Sakit",
  izin: "Izin",
  alpa: "Alpa",
};

/** Singkatan satu huruf untuk tombol cepat H/S/I/A. */
export const SINGKATAN_STATUS: Record<StatusKehadiran, string> = {
  hadir: "H",
  sakit: "S",
  izin: "I",
  alpa: "A",
};

export const LABEL_SESI: Record<SesiKehadiran, string> = {
  hifzh: "Hifzh",
  diniyyah: "Diniyyah",
};

export interface JadwalSesi {
  id: string;
  jenis: SesiKehadiran;
  jamLabel: string;
  mapel: string | null;
}

export interface BarisKehadiran {
  id: string;
  santriId: string;
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
  sesiJenis: SesiKehadiran;
  jadwalId: string | null;
  jamLabel: string;
  status: StatusKehadiran;
  pengisiNama: string | null;
}

export interface LogRevisi {
  id: string;
  kehadiranId: string;
  statusLama: StatusKehadiran;
  statusBaru: StatusKehadiran;
  alasan: string;
  diubahOlehNama: string | null;
  waktu: string;
}

export interface ProfilSaya {
  id: string;
  nama: string;
  peran: PeranDb;
}

/* ------------------------------------------------------------------ */
/* Profil pengguna yang sedang masuk                                    */
/* ------------------------------------------------------------------ */

/**
 * Profil pengguna saat ini.
 * MODE CONTOH: mengembalikan admin contoh ("Admin Contoh") agar bagian
 * revisi khusus admin di halaman kehadiran bisa dirender & diuji.
 * MODE SUPABASE: login asli Supabase Auth sudah tersambung — peran
 * dibaca dari tabel profiles berdasarkan auth.uid(), dan RLS di
 * database menolak revisi dari non-admin.
 */
export async function ambilProfilSaya(): Promise<HasilSantri<ProfilSaya>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: profil admin fiksi.
    return {
      data: { id: "profil-contoh-admin", nama: "Admin Contoh", peran: "admin" },
      sumberContoh: true,
    };
  }
  const supabase = buatKlienBrowser();
  const {
    data: { user },
    error: galatSesi,
  } = await supabase.auth.getUser();
  if (galatSesi || !user) {
    throw new Error("Belum ada sesi login yang aktif.");
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nama, peran")
    .eq("id", user.id)
    .single();
  if (error) {
    throw new Error(`Gagal membaca profil pengguna: ${error.message}`);
  }
  const baris = data as { id: string; nama: string; peran: PeranDb };
  return {
    data: { id: baris.id, nama: baris.nama, peran: baris.peran },
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Jadwal sesi                                                          */
/* ------------------------------------------------------------------ */

/** Slot jadwal untuk satu jenis sesi (hifzh / diniyyah). */
export async function ambilJadwalSesi(
  jenis: SesiKehadiran,
): Promise<HasilSantri<JadwalSesi[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: jadwal fiksi dari src/lib/contoh/ (mapel masih kosong).
    return {
      data: JADWAL_CONTOH.filter((j) => j.jenis === jenis).map((j) => ({
        id: j.id,
        jenis,
        jamLabel: j.jamLabel,
        mapel: j.mapel,
      })),
      sumberContoh: true,
    };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("jadwal_sesi")
    .select("id, jenis, jam_label, mapel")
    .eq("jenis", jenis)
    .order("jam_label", { ascending: true });
  if (error) {
    throw new Error(`Gagal membaca jadwal sesi: ${error.message}`);
  }
  return {
    data: (
      data as { id: string; jam_label: string; mapel: string | null }[]
    ).map((j) => ({
      id: j.id,
      jenis,
      jamLabel: j.jam_label,
      mapel: j.mapel,
    })),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Membaca kehadiran                                                    */
/* ------------------------------------------------------------------ */

function contohKeBaris(k: KehadiranContoh): BarisKehadiran {
  return {
    id: k.id,
    santriId: k.santriId,
    tanggal: k.tanggal,
    sesiJenis: k.sesiJenis,
    jadwalId: k.jadwalId,
    jamLabel: k.jamLabel,
    status: k.status,
    pengisiNama: k.pengisiNama,
  };
}

interface BarisKehadiranDb {
  id: string;
  santri_id: string;
  tanggal: string;
  sesi_jenis: SesiKehadiran;
  jadwal_id: string | null;
  status: StatusKehadiran;
  jadwal: { jam_label: string } | null;
  pengisi: { nama: string } | null;
}

const PILIHAN_KEHADIRAN =
  "id, santri_id, tanggal, sesi_jenis, jadwal_id, status, jadwal:jadwal_id ( jam_label ), pengisi:pengisi_id ( nama )";

function barisDbKeBaris(b: BarisKehadiranDb): BarisKehadiran {
  return {
    id: b.id,
    santriId: b.santri_id,
    tanggal: b.tanggal,
    sesiJenis: b.sesi_jenis,
    jadwalId: b.jadwal_id,
    jamLabel: b.jadwal?.jam_label ?? "-",
    status: b.status,
    pengisiNama: b.pengisi?.nama ?? null,
  };
}

/**
 * Daftar kehadiran untuk satu tanggal + sesi (+ slot jadwal bila dipilih).
 * Dipakai halaman kehadiran untuk mengisi awal formulir cepat.
 */
export async function ambilKehadiran(
  tanggal: string,
  sesiJenis: SesiKehadiran,
  jadwalId?: string | null,
): Promise<HasilSantri<BarisKehadiran[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: saring gudang contoh di memori.
    const data = semuaKehadiranContoh()
      .filter(
        (k) =>
          k.tanggal === tanggal &&
          k.sesiJenis === sesiJenis &&
          (jadwalId === undefined || k.jadwalId === jadwalId),
      )
      .map(contohKeBaris);
    return { data, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  let kueri = supabase
    .from("kehadiran")
    .select(PILIHAN_KEHADIRAN)
    .eq("tanggal", tanggal)
    .eq("sesi_jenis", sesiJenis);
  if (jadwalId) kueri = kueri.eq("jadwal_id", jadwalId);
  const { data, error } = await kueri.order("santri_id", { ascending: true });
  if (error) {
    throw new Error(`Gagal membaca kehadiran: ${error.message}`);
  }
  return {
    data: (data as unknown as BarisKehadiranDb[]).map(barisDbKeBaris),
    sumberContoh: false,
  };
}

/** Riwayat kehadiran satu santri, terbaru dulu (untuk tab Kehadiran di detail santri). */
export async function ambilRiwayatKehadiranSantri(
  santriId: string,
): Promise<HasilSantri<BarisKehadiran[]>> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: riwayat fiksi santri tsb dari gudang contoh.
    const data = semuaKehadiranContoh()
      .filter((k) => k.santriId === santriId)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .map(contohKeBaris);
    return { data, sumberContoh: true };
  }
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("kehadiran")
    .select(PILIHAN_KEHADIRAN)
    .eq("santri_id", santriId)
    .in("sesi_jenis", ["hifzh", "diniyyah"])
    .order("tanggal", { ascending: false })
    .limit(60);
  if (error) {
    throw new Error(`Gagal membaca riwayat kehadiran: ${error.message}`);
  }
  return {
    data: (data as unknown as BarisKehadiranDb[]).map(barisDbKeBaris),
    sumberContoh: false,
  };
}

/** Log revisi untuk baris-baris kehadiran milik satu santri. */
export async function ambilLogRevisiSantri(
  santriId: string,
): Promise<HasilSantri<LogRevisi[]>> {
  const riwayat = await ambilRiwayatKehadiranSantri(santriId);
  if (riwayat.sumberContoh) {
    // MODE CONTOH: saring log fiksi berdasarkan baris riwayat santri ini.
    const idBaris = new Set(riwayat.data.map((b) => b.id));
    const data: LogRevisi[] = semuaLogRevisiContoh()
      .filter((l) => idBaris.has(l.kehadiranId))
      .map((l) => ({
        id: l.id,
        kehadiranId: l.kehadiranId,
        statusLama: l.statusLama,
        statusBaru: l.statusBaru,
        alasan: l.alasan,
        diubahOlehNama: l.diubahOlehNama,
        waktu: l.waktu,
      }));
    return { data, sumberContoh: true };
  }
  if (riwayat.data.length === 0) return { data: [], sumberContoh: false };
  const supabase = buatKlienBrowser();
  const { data, error } = await supabase
    .from("kehadiran_log_revisi")
    .select(
      "id, kehadiran_id, status_lama, status_baru, alasan, waktu, pengubah:diubah_oleh ( nama )",
    )
    .in(
      "kehadiran_id",
      riwayat.data.map((b) => b.id),
    )
    .order("waktu", { ascending: false });
  if (error) {
    throw new Error(`Gagal membaca log revisi: ${error.message}`);
  }
  const barisDb = data as unknown as {
    id: string;
    kehadiran_id: string;
    status_lama: StatusKehadiran;
    status_baru: StatusKehadiran;
    alasan: string;
    waktu: string;
    pengubah: { nama: string } | null;
  }[];
  return {
    data: barisDb.map((l) => ({
      id: l.id,
      kehadiranId: l.kehadiran_id,
      statusLama: l.status_lama,
      statusBaru: l.status_baru,
      alasan: l.alasan,
      diubahOlehNama: l.pengubah?.nama ?? null,
      waktu: l.waktu,
    })),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Menyimpan kehadiran massal                                           */
/* ------------------------------------------------------------------ */

export interface EntriKehadiranBaru {
  santriId: string;
  status: StatusKehadiran;
}

export interface PermintaanSimpanKehadiran {
  tanggal: string;
  sesiJenis: SesiKehadiran;
  jadwalId: string | null;
  entri: EntriKehadiranBaru[];
}

/**
 * Simpan kehadiran satu sesi untuk banyak santri sekaligus.
 * Di database memakai upsert pada kunci unik (santri, tanggal, sesi,
 * jadwal); pengisi selalu pengguna yang sedang login (dijaga juga oleh
 * RLS: pengisi_id harus = auth.uid()).
 */
export async function simpanKehadiranMassal(
  permintaan: PermintaanSimpanKehadiran,
): Promise<HasilSantri<{ tersimpan: number }>> {
  if (permintaan.entri.length === 0) {
    throw new Error("Belum ada santri yang diberi status kehadiran.");
  }
  const profil = await ambilProfilSaya();

  if (!supabaseTerhubung()) {
    // MODE CONTOH: tulis ke gudang contoh di memori (hilang saat muat ulang).
    const jadwal = JADWAL_CONTOH.find((j) => j.id === permintaan.jadwalId);
    for (const e of permintaan.entri) {
      simpanKehadiranContoh({
        id: idKehadiranContohBaru(),
        santriId: e.santriId,
        tanggal: permintaan.tanggal,
        sesiJenis: permintaan.sesiJenis,
        jadwalId: permintaan.jadwalId,
        jamLabel: jadwal?.jamLabel ?? "-",
        status: e.status,
        pengisiNama: profil.data.nama,
      });
    }
    return {
      data: { tersimpan: permintaan.entri.length },
      sumberContoh: true,
    };
  }

  const supabase = buatKlienBrowser();
  const baris = permintaan.entri.map((e) => ({
    santri_id: e.santriId,
    tanggal: permintaan.tanggal,
    sesi_jenis: permintaan.sesiJenis,
    jadwal_id: permintaan.jadwalId,
    status: e.status,
    pengisi_id: profil.data.id,
  }));
  const { error } = await supabase.from("kehadiran").upsert(baris, {
    onConflict: "santri_id,tanggal,sesi_jenis,jadwal_id",
  });
  if (error) {
    throw new Error(`Gagal menyimpan kehadiran: ${error.message}`);
  }
  return { data: { tersimpan: baris.length }, sumberContoh: false };
}

/* ------------------------------------------------------------------ */
/* Revisi kehadiran — KHUSUS ADMIN, lewat RPC revisi_kehadiran          */
/* ------------------------------------------------------------------ */

export interface PermintaanRevisi {
  kehadiranId: string;
  statusBaru: StatusKehadiran;
  /** Wajib terisi (ditegakkan juga oleh prosedur di database). */
  alasan: string;
}

/**
 * Ajukan revisi status kehadiran. Memanggil RPC revisi_kehadiran()
 * (security definer, khusus admin, selalu menulis kehadiran_log_revisi).
 * Fungsi ini sengaja TIDAK menyediakan jalan mengubah status lewat
 * update tabel langsung.
 */
export async function ajukanRevisiKehadiran(
  permintaan: PermintaanRevisi,
): Promise<HasilSantri<LogRevisi>> {
  if (!permintaan.alasan.trim()) {
    throw new Error("Alasan revisi wajib diisi.");
  }

  if (!supabaseTerhubung()) {
    // MODE CONTOH: meniru RPC — periksa peran contoh, ubah status, catat log.
    const profil = await ambilProfilSaya();
    if (profil.data.peran !== "admin") {
      throw new Error("Revisi kehadiran hanya boleh dilakukan ADMIN utama.");
    }
    const log = revisiKehadiranContoh(
      permintaan.kehadiranId,
      permintaan.statusBaru,
      permintaan.alasan.trim(),
      profil.data.nama,
    );
    return {
      data: {
        id: log.id,
        kehadiranId: log.kehadiranId,
        statusLama: log.statusLama,
        statusBaru: log.statusBaru,
        alasan: log.alasan,
        diubahOlehNama: log.diubahOlehNama,
        waktu: log.waktu,
      },
      sumberContoh: true,
    };
  }

  const supabase = buatKlienBrowser();
  const { data, error } = await supabase.rpc("revisi_kehadiran", {
    p_kehadiran_id: permintaan.kehadiranId,
    p_status_baru: permintaan.statusBaru,
    p_alasan: permintaan.alasan.trim(),
  });
  if (error) {
    throw new Error(`Revisi kehadiran ditolak: ${error.message}`);
  }
  const log = data as {
    id: string;
    kehadiran_id: string;
    status_lama: StatusKehadiran;
    status_baru: StatusKehadiran;
    alasan: string;
    waktu: string;
  };
  const profil = await ambilProfilSaya();
  return {
    data: {
      id: log.id,
      kehadiranId: log.kehadiran_id,
      statusLama: log.status_lama,
      statusBaru: log.status_baru,
      alasan: log.alasan,
      diubahOlehNama: profil.data.nama,
      waktu: log.waktu,
    },
    sumberContoh: false,
  };
}
