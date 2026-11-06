import type { Peran } from "@/lib/peran";
export const STATUS_IZIN = {
  menunggu: "Menunggu pemeriksaan",
  perlu_perbaikan: "Perlu perbaikan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
  sedang_izin: "Sedang izin",
  sudah_kembali: "Sudah kembali",
};
export type StatusIzin = keyof typeof STATUS_IZIN;
export const AKSI_IZIN = {
  setujui: "Setujui",
  tolak: "Tolak",
  perbaiki: "Minta perbaikan",
  batalkan: "Batalkan izin",
  keluar: "Catat keberangkatan",
  kembali: "Catat kepulangan",
};
export type AksiIzin = keyof typeof AKSI_IZIN;
export function pilihanAksi(
  peran: Peran | null,
  status: StatusIzin,
  pemilik: boolean,
): AksiIzin[] {
  const staf = peran === "admin" || peran === "musyrif";
  const a: AksiIzin[] = staf
    ? status === "menunggu"
      ? ["setujui", "perbaiki", "tolak"]
      : status === "disetujui"
        ? ["keluar"]
        : status === "sedang_izin"
          ? ["kembali"]
          : []
    : [];
  if (
    (staf || (peran === "wali" && pemilik)) &&
    ["menunggu", "perlu_perbaikan", "disetujui"].includes(status)
  )
    a.push("batalkan");
  return a;
}
export function isoWib(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v))
    throw Error("Isi tanggal dan waktu dengan lengkap.");
  const d = new Date(v + ":00+07:00");
  if (!Number.isFinite(d.getTime()) || inputWib(d.toISOString()) !== v)
    throw Error("Tanggal tidak valid.");
  return d.toISOString();
}
export function inputWib(v: string) {
  return new Date(new Date(v).getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 16);
}
export function waktuIzin(v: string | null) {
  return v
    ? new Date(v).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    : "Belum dicatat";
}
export interface DataPengajuan {
  santri_id: string;
  kunci: string;
  jenis: string;
  alasan: string;
  tujuan: string;
  rencana_keluar: string;
  rencana_kembali: string;
  penjemput: string;
  hubungan: string;
  kontak: string;
  lampiran_path: string | null;
}
export function validasiPengajuan(p: DataPengajuan, sekarang = Date.now()) {
  if (!p.santri_id) throw Error("Pilih anak yang mengajukan izin.");
  for (const [nilai, min, max, label] of [
    [p.alasan, 5, 2000, "Alasan"],
    [p.tujuan, 3, 300, "Tujuan"],
    [p.penjemput, 3, 120, "Penjemput"],
    [p.hubungan, 2, 80, "Hubungan"],
  ] as const)
    if (nilai.trim().length < min || nilai.trim().length > max)
      throw Error(`${label} harus ${min}–${max} karakter.`);
  if (!["pulang", "keluar", "berobat"].includes(p.jenis))
    throw Error("Pilih jenis izin.");
  if (
    !/^[+0-9 ()-]+$/.test(p.kontak) ||
    p.kontak.length > 24 ||
    !/^\d{8,15}$/.test(p.kontak.replace(/\D/g, ""))
  )
    throw Error("Nomor kontak harus berisi 8–15 angka.");
  const a = Date.parse(p.rencana_keluar),
    b = Date.parse(p.rencana_kembali);
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    a < sekarang - 15 * 60000 ||
    b <= a
  )
    throw Error(
      "Rencana kembali harus setelah keluar dan waktu keluar belum lewat.",
    );
}
