/**
 * Lapisan data — REKAP KEHADIRAN & AGREGAT GRAFIK HIFZH (Jalur F, Tahap 2).
 *
 * Sumber kebenaran agregat adalah VIEW di database
 * (supabase/migrations/0002_functions_views.sql):
 *   public.rekap_kehadiran_pekanan   — H/S/I/A per santri per pekan (ISO)
 *   public.rekap_kehadiran_semester  — H/S/I/A per santri per semester
 *   public.grafik_hifzh_mingguan     — setoran per santri/pekan/jenis + L/U
 *   public.grafik_hifzh_bulanan      — setoran per santri/bulan/jenis + L/U
 * Semua view memakai security_invoker, jadi RLS tabel sumber tetap
 * berlaku mengikuti pembaca: staf melihat semua santri, wali hanya
 * agregat anaknya sendiri.
 *
 * POLA DATA (sama seperti lapisan data lain di tahap ini):
 * - Bila env Supabase BELUM terisi, fungsi memakai DATA CONTOH FIKSI:
 *   rekap kehadiran dihitung setempat dari gudang contoh yang sama
 *   dengan lib/data/kehadiran.ts (src/lib/contoh/kehadiran-contoh.ts),
 *   sehingga isian/revisi dari halaman Kehadiran ikut terhitung di
 *   rekap; agregat grafik dihitung dari setoran contoh milik
 *   lib/data/hifzh.ts. Hasil ditandai `sumberContoh: true`.
 * - Bila env terisi, fungsi membaca view di atas lewat klien Supabase.
 *   Bila kueri view GRAFIK gagal (mis. migrasi belum dijalankan), fungsi
 *   grafik jatuh kembali ke agregasi setoran setempat dengan peringatan
 *   konsol — meniru pola lib/data/hifzh.ts. Rekap kehadiran tidak
 *   berkamuflase: galatnya diteruskan agar halaman menampilkan kendala.
 *
 * Halaman TIDAK boleh membaca view / gudang contoh secara langsung;
 * selalu lewat fungsi di file ini.
 */
import { semuaBaris } from "@/lib/data/halaman";
import { buatKlienBrowser } from "@/lib/supabase/client";
import {
  ambilDaftarSantri,
  supabaseTerhubung,
  type HasilSantri,
  type Santri,
} from "@/lib/data/santri";
import { ambilSetoranTerakhir, type SetoranHifzh } from "@/lib/data/hifzh";
import { semuaKehadiranContoh } from "@/lib/contoh/kehadiran-contoh";
import type { StatusKehadiran } from "@/lib/data/kehadiran";
import type { JenisSetoran } from "@/lib/hifzh";

/* ------------------------------------------------------------------ */
/* Tipe hasil                                                           */
/* ------------------------------------------------------------------ */

/** Inti satu baris rekap per santri (cermin kolom hitungan view rekap). */
export interface RekapSantriInti {
  santriId: string;
  santriNama: string;
  kelasId: string;
  /** Tingkat kelas 1/2/3; 0 bila kelas tidak dikenal. */
  kelasTingkat: number;
  kelasNama: string;
  jumlahHadir: number;
  jumlahSakit: number;
  jumlahIzin: number;
  jumlahAlpa: number;
  totalSesi: number;
  /** Persen hadir = jumlahHadir / totalSesi × 100 (1 angka di belakang koma). */
  persenHadir: number;
}

export interface BarisRekapPekanan extends RekapSantriInti {
  /** Senin pekan tsb, format ISO: YYYY-MM-DD. */
  pekanMulai: string;
}

export interface BarisRekapSemester extends RekapSantriInti {
  semesterId: string;
  semesterNama: string;
  /** "gasal" | "genap" mengikuti kolom jenis di tabel semester. */
  semesterJenis: string;
}

/** Ringkasan satu kelas, hasil penjumlahan baris-baris per santri. */
export interface RingkasanKelas {
  kelasId: string;
  kelasTingkat: number;
  kelasNama: string;
  jumlahSantri: number;
  jumlahHadir: number;
  jumlahSakit: number;
  jumlahIzin: number;
  jumlahAlpa: number;
  totalSesi: number;
  persenHadir: number;
}

/** Satu sel agregat grafik hifzh: satu periode × satu jenis setoran. */
export interface BarisGrafikHifzh {
  /** Awal periode (Senin pekan / tanggal 1 bulan), format ISO. */
  periodeMulai: string;
  jenis: JenisSetoran;
  jumlahSetoran: number;
  totalHalaman: number;
  jumlahL: number;
  jumlahU: number;
}

export interface AgregatGrafikHifzh {
  mingguan: BarisGrafikHifzh[];
  bulanan: BarisGrafikHifzh[];
}

/* ------------------------------------------------------------------ */
/* Semester contoh (FIKSI)                                              */
/* ------------------------------------------------------------------ */

/**
 * Semester contoh untuk mode contoh. Tanggal resmi semester gasal/genap
 * MASIH MENUNGGU user (salah satu pertanyaan terbuka Tahap 1–2), jadi
 * rentang di bawah ini SEMENTARA dan hanya membungkus tanggal-tanggal
 * data contoh kehadiran (Okt–Nov 2026). Jangan dianggap tanggal resmi.
 */
const SEMESTER_CONTOH = [
  {
    id: "contoh-semester-gasal",
    nama: "Semester Gasal (Contoh)",
    jenis: "gasal",
    tanggalMulai: "2026-07-01",
    tanggalSelesai: "2026-12-31",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Pembantu tanggal & hitung                                            */
/* ------------------------------------------------------------------ */

/** Persen hadir dengan 1 angka di belakang koma; 0 bila belum ada sesi. */
export function persenHadir(jumlahHadir: number, totalSesi: number): number {
  if (totalSesi <= 0) return 0;
  return Math.round((jumlahHadir / totalSesi) * 1000) / 10;
}

function keUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function keIso(tanggal: Date): string {
  return tanggal.toISOString().slice(0, 10);
}

/** Senin dari pekan yang memuat tanggal ISO tsb (pekan ISO, mulai Senin). */
export function seninPekan(iso: string): string {
  const d = keUtc(iso);
  const geser = (d.getUTCDay() + 6) % 7; // Senin = 0
  d.setUTCDate(d.getUTCDate() - geser);
  return keIso(d);
}

/** Tanggal 1 dari bulan yang memuat tanggal ISO tsb. */
export function awalBulan(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

interface Hitungan {
  jumlahHadir: number;
  jumlahSakit: number;
  jumlahIzin: number;
  jumlahAlpa: number;
  totalSesi: number;
}

function hitunganKosong(): Hitungan {
  return {
    jumlahHadir: 0,
    jumlahSakit: 0,
    jumlahIzin: 0,
    jumlahAlpa: 0,
    totalSesi: 0,
  };
}

function tambahStatus(h: Hitungan, status: StatusKehadiran): void {
  h.totalSesi += 1;
  if (status === "hadir") h.jumlahHadir += 1;
  else if (status === "sakit") h.jumlahSakit += 1;
  else if (status === "izin") h.jumlahIzin += 1;
  else h.jumlahAlpa += 1;
}

/**
 * Peta santriId → identitas (nama & kelas) dari lapisan data santri.
 * Dipakai memperkaya baris view/contoh; bila gagal dibaca, peta kosong
 * dan pemanggil memakai nama cadangan dari baris sumbernya sendiri.
 */
async function petaSantri(): Promise<Map<string, Santri>> {
  try {
    const hasil = await ambilDaftarSantri();
    return new Map(hasil.data.map((s) => [s.id, s]));
  } catch {
    return new Map<string, Santri>();
  }
}

function lengkapiInti<T extends Omit<RekapSantriInti, "persenHadir">>(
  inti: T,
): T & { persenHadir: number } {
  return {
    ...inti,
    persenHadir: persenHadir(inti.jumlahHadir, inti.totalSesi),
  };
}

/** Jumlahkan baris rekap per santri menjadi ringkasan per kelas. */
export function ringkasPerKelas(baris: RekapSantriInti[]): RingkasanKelas[] {
  const peta = new Map<string, RingkasanKelas & { idSantri: Set<string> }>();
  for (const b of baris) {
    let r = peta.get(b.kelasId);
    if (!r) {
      r = {
        kelasId: b.kelasId,
        kelasTingkat: b.kelasTingkat,
        kelasNama: b.kelasNama,
        jumlahSantri: 0,
        jumlahHadir: 0,
        jumlahSakit: 0,
        jumlahIzin: 0,
        jumlahAlpa: 0,
        totalSesi: 0,
        persenHadir: 0,
        idSantri: new Set<string>(),
      };
      peta.set(b.kelasId, r);
    }
    r.idSantri.add(b.santriId);
    r.jumlahHadir += b.jumlahHadir;
    r.jumlahSakit += b.jumlahSakit;
    r.jumlahIzin += b.jumlahIzin;
    r.jumlahAlpa += b.jumlahAlpa;
    r.totalSesi += b.totalSesi;
  }
  return [...peta.values()]
    .map(({ idSantri, ...r }) => ({
      ...r,
      jumlahSantri: idSantri.size,
      persenHadir: persenHadir(r.jumlahHadir, r.totalSesi),
    }))
    .sort((a, b) => a.kelasTingkat - b.kelasTingkat);
}

/* ------------------------------------------------------------------ */
/* Rekap kehadiran PEKANAN                                              */
/* ------------------------------------------------------------------ */

export async function ambilRekapPekanan(): Promise<
  HasilSantri<BarisRekapPekanan[]>
> {
  const peta = await petaSantri();

  if (!supabaseTerhubung()) {
    // MODE CONTOH: hitung dari gudang contoh kehadiran (sumber yang sama
    // dengan halaman Kehadiran, jadi isian sesi ini ikut terhitung).
    const kelompok = new Map<
      string,
      { pekanMulai: string; santriId: string; hitung: Hitungan }
    >();
    for (const k of semuaKehadiranContoh()) {
      const pekanMulai = seninPekan(k.tanggal);
      const kunci = `${pekanMulai}|${k.santriId}`;
      let sel = kelompok.get(kunci);
      if (!sel) {
        sel = { pekanMulai, santriId: k.santriId, hitung: hitunganKosong() };
        kelompok.set(kunci, sel);
      }
      tambahStatus(sel.hitung, k.status);
    }
    const data = [...kelompok.values()].map((sel) => {
      const s = peta.get(sel.santriId);
      return lengkapiInti({
        santriId: sel.santriId,
        santriNama: s?.nama ?? sel.santriId,
        kelasId: s?.kelasId ?? "",
        kelasTingkat: s?.kelasTingkat ?? 0,
        kelasNama: s?.kelasNama ?? "Tanpa Kelas",
        ...sel.hitung,
        pekanMulai: sel.pekanMulai,
      });
    });
    data.sort(
      (a, b) =>
        b.pekanMulai.localeCompare(a.pekanMulai) ||
        a.santriNama.localeCompare(b.santriNama),
    );
    return { data, sumberContoh: true };
  }

  const supabase = buatKlienBrowser();
  const data = await semuaBaris<Record<string, unknown>>(() =>
    supabase
      .from("rekap_kehadiran_pekanan")
      .select(
        "santri_id, santri_nama, kelas_id, pekan_mulai, jumlah_hadir, jumlah_sakit, jumlah_izin, jumlah_alpa, total_sesi",
        { count: "exact" },
      )
      .order("pekan_mulai", { ascending: false })
      .order("santri_nama", { ascending: true })
      .order("santri_id"),
  );
  const barisDb = (data ?? []) as Array<Record<string, unknown>>;
  return {
    data: barisDb.map((b) => {
      const s = peta.get(String(b.santri_id));
      return lengkapiInti({
        santriId: String(b.santri_id),
        santriNama: s?.nama ?? String(b.santri_nama ?? ""),
        kelasId: String(b.kelas_id ?? ""),
        kelasTingkat: s?.kelasTingkat ?? 0,
        kelasNama: s?.kelasNama ?? "Tanpa Kelas",
        jumlahHadir: Number(b.jumlah_hadir ?? 0),
        jumlahSakit: Number(b.jumlah_sakit ?? 0),
        jumlahIzin: Number(b.jumlah_izin ?? 0),
        jumlahAlpa: Number(b.jumlah_alpa ?? 0),
        totalSesi: Number(b.total_sesi ?? 0),
        pekanMulai: String(b.pekan_mulai),
      });
    }),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Rekap kehadiran SEMESTERAN                                           */
/* ------------------------------------------------------------------ */

export async function ambilRekapSemester(): Promise<
  HasilSantri<BarisRekapSemester[]>
> {
  const peta = await petaSantri();

  if (!supabaseTerhubung()) {
    // MODE CONTOH: baris kehadiran dimasukkan ke semester contoh yang
    // rentang tanggalnya memuat tanggal kehadiran (meniru view asli).
    const kelompok = new Map<
      string,
      {
        semester: (typeof SEMESTER_CONTOH)[number];
        santriId: string;
        hitung: Hitungan;
      }
    >();
    for (const k of semuaKehadiranContoh()) {
      const semester = SEMESTER_CONTOH.find(
        (sm) => k.tanggal >= sm.tanggalMulai && k.tanggal <= sm.tanggalSelesai,
      );
      if (!semester) continue;
      const kunci = `${semester.id}|${k.santriId}`;
      let sel = kelompok.get(kunci);
      if (!sel) {
        sel = { semester, santriId: k.santriId, hitung: hitunganKosong() };
        kelompok.set(kunci, sel);
      }
      tambahStatus(sel.hitung, k.status);
    }
    const data = [...kelompok.values()].map((sel) => {
      const s = peta.get(sel.santriId);
      return lengkapiInti({
        santriId: sel.santriId,
        santriNama: s?.nama ?? sel.santriId,
        kelasId: s?.kelasId ?? "",
        kelasTingkat: s?.kelasTingkat ?? 0,
        kelasNama: s?.kelasNama ?? "Tanpa Kelas",
        ...sel.hitung,
        semesterId: sel.semester.id,
        semesterNama: sel.semester.nama,
        semesterJenis: sel.semester.jenis,
      });
    });
    data.sort((a, b) => a.santriNama.localeCompare(b.santriNama));
    return { data, sumberContoh: true };
  }

  const supabase = buatKlienBrowser();
  const data = await semuaBaris<Record<string, unknown>>(() =>
    supabase
      .from("rekap_kehadiran_semester")
      .select(
        "semester_id, semester_nama, semester_jenis, santri_id, santri_nama, kelas_id, jumlah_hadir, jumlah_sakit, jumlah_izin, jumlah_alpa, total_sesi",
        { count: "exact" },
      )
      .order("santri_nama", { ascending: true })
      .order("semester_id")
      .order("santri_id"),
  );
  const barisDb = (data ?? []) as Array<Record<string, unknown>>;
  return {
    data: barisDb.map((b) => {
      const s = peta.get(String(b.santri_id));
      return lengkapiInti({
        santriId: String(b.santri_id),
        santriNama: s?.nama ?? String(b.santri_nama ?? ""),
        kelasId: String(b.kelas_id ?? ""),
        kelasTingkat: s?.kelasTingkat ?? 0,
        kelasNama: s?.kelasNama ?? "Tanpa Kelas",
        jumlahHadir: Number(b.jumlah_hadir ?? 0),
        jumlahSakit: Number(b.jumlah_sakit ?? 0),
        jumlahIzin: Number(b.jumlah_izin ?? 0),
        jumlahAlpa: Number(b.jumlah_alpa ?? 0),
        totalSesi: Number(b.total_sesi ?? 0),
        semesterId: String(b.semester_id),
        semesterNama: String(b.semester_nama ?? ""),
        semesterJenis: String(b.semester_jenis ?? ""),
      });
    }),
    sumberContoh: false,
  };
}

/* ------------------------------------------------------------------ */
/* Agregat grafik hifzh (mingguan & bulanan)                            */
/* ------------------------------------------------------------------ */

function agregatDariSetoran(
  setoran: SetoranHifzh[],
  kunciPeriode: (tanggalIso: string) => string,
): BarisGrafikHifzh[] {
  const kelompok = new Map<string, BarisGrafikHifzh>();
  for (const s of setoran) {
    const periodeMulai = kunciPeriode(s.tanggalMasehi);
    const kunci = `${periodeMulai}|${s.jenis}`;
    let sel = kelompok.get(kunci);
    if (!sel) {
      sel = {
        periodeMulai,
        jenis: s.jenis,
        jumlahSetoran: 0,
        totalHalaman: 0,
        jumlahL: 0,
        jumlahU: 0,
      };
      kelompok.set(kunci, sel);
    }
    sel.jumlahSetoran += 1;
    sel.totalHalaman += s.halaman;
    if (s.nilaiHuruf === "L") sel.jumlahL += 1;
    else sel.jumlahU += 1;
  }
  return [...kelompok.values()].sort((a, b) =>
    a.periodeMulai.localeCompare(b.periodeMulai),
  );
}

/** Agregat grafik dari setoran setempat (mode contoh / cadangan). */
async function agregatCadangan(): Promise<{
  agregat: AgregatGrafikHifzh;
  sumberContoh: boolean;
}> {
  const hasil = await ambilSetoranTerakhir(500);
  return {
    agregat: {
      mingguan: agregatDariSetoran(hasil.data, seninPekan),
      bulanan: agregatDariSetoran(hasil.data, awalBulan),
    },
    sumberContoh: hasil.sumber === "contoh",
  };
}

interface BarisGrafikDb extends Record<string, unknown> {
  jenis: JenisSetoran;
  jumlah_setoran: number | string;
  total_halaman: number | string;
  jumlah_l: number | string;
  jumlah_u: number | string;
}

/** Jumlahkan baris view (per santri) menjadi per periode × per jenis. */
function jumlahkanBarisView(
  barisDb: BarisGrafikDb[],
  kolomPeriode: "pekan_mulai" | "bulan_mulai",
): BarisGrafikHifzh[] {
  const kelompok = new Map<string, BarisGrafikHifzh>();
  for (const b of barisDb) {
    const periodeMulai = String(b[kolomPeriode]);
    const kunci = `${periodeMulai}|${b.jenis}`;
    let sel = kelompok.get(kunci);
    if (!sel) {
      sel = {
        periodeMulai,
        jenis: b.jenis,
        jumlahSetoran: 0,
        totalHalaman: 0,
        jumlahL: 0,
        jumlahU: 0,
      };
      kelompok.set(kunci, sel);
    }
    sel.jumlahSetoran += Number(b.jumlah_setoran ?? 0);
    sel.totalHalaman += Number(b.total_halaman ?? 0);
    sel.jumlahL += Number(b.jumlah_l ?? 0);
    sel.jumlahU += Number(b.jumlah_u ?? 0);
  }
  return [...kelompok.values()].sort((a, b) =>
    a.periodeMulai.localeCompare(b.periodeMulai),
  );
}

export async function ambilAgregatGrafikHifzh(): Promise<
  HasilSantri<AgregatGrafikHifzh>
> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: agregasi dari setoran contoh lib/data/hifzh.ts.
    const { agregat } = await agregatCadangan();
    return { data: agregat, sumberContoh: true };
  }
  try {
    const supabase = buatKlienBrowser();
    const [mingguan, bulanan] = await Promise.all([
      semuaBaris<BarisGrafikDb>(() =>
        supabase
          .from("grafik_hifzh_mingguan")
          .select(
            "pekan_mulai,jenis,jumlah_setoran,total_halaman,jumlah_l,jumlah_u",
            { count: "exact" },
          )
          .order("pekan_mulai")
          .order("jenis"),
      ),
      semuaBaris<BarisGrafikDb>(() =>
        supabase
          .from("grafik_hifzh_bulanan")
          .select(
            "bulan_mulai,jenis,jumlah_setoran,total_halaman,jumlah_l,jumlah_u",
            { count: "exact" },
          )
          .order("bulan_mulai")
          .order("jenis"),
      ),
    ]);
    return {
      data: {
        mingguan: jumlahkanBarisView(mingguan, "pekan_mulai"),
        bulanan: jumlahkanBarisView(bulanan, "bulan_mulai"),
      },
      sumberContoh: false,
    };
  } catch {
    throw new Error(
      "Grafik Hifzh belum dapat dimuat. Periksa koneksi dan coba lagi.",
    );
  }
}
