import { batasPeriode } from "@/lib/filter-periode";
export const JENIS_TAGIHAN = {
  spp: "SPP bulanan",
  daftar_ulang: "Daftar ulang",
  seragam: "Seragam",
  kegiatan: "Kegiatan",
  lainnya: "Lainnya",
};
export type JenisTagihan = keyof typeof JENIS_TAGIHAN;
export const STATUS_TAGIHAN = {
  belum_bayar: "Belum dibayar",
  sebagian: "Dibayar sebagian",
  lunas: "Lunas",
  dibatalkan: "Dibatalkan",
};
export type StatusTagihan = keyof typeof STATUS_TAGIHAN;
export const STATUS_PEMBAYARAN = {
  menunggu: "Menunggu verifikasi",
  diterima: "Diterima",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
};
export type StatusPembayaran = keyof typeof STATUS_PEMBAYARAN;
export type AksiKeuangan =
  "terima" | "tolak" | "tarik" | "koreksi" | "batalkan_tagihan";
export const LABEL_AKSI: Record<AksiKeuangan, string> = {
  terima: "Terima pembayaran",
  tolak: "Tolak bukti",
  tarik: "Tarik pengajuan",
  koreksi: "Koreksi / batalkan pembayaran",
  batalkan_tagihan: "Batalkan tagihan",
};
export function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
export function tanggalKeuangan(v: string) {
  return new Date(v.slice(0, 10) + "T12:00:00+07:00").toLocaleDateString(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}
export function bulanTagihan(v: string) {
  return new Date(v.slice(0, 7) + "-01T12:00:00+07:00").toLocaleDateString(
    "id-ID",
    { timeZone: "Asia/Jakarta", month: "long", year: "numeric" },
  );
}
export function hariWib() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}
export function angkaRupiah(v: string) {
  if (!/^\d+$/.test(v))
    throw Error("Nominal harus angka rupiah bulat, tanpa titik atau koma.");
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1 || n > 1000000000)
    throw Error("Nominal harus Rp1–Rp1.000.000.000.");
  return n;
}
export interface TagihanBaru {
  kunci: string;
  santri_ids: string[];
  judul: string;
  jenis: JenisTagihan;
  periode: string;
  nominal: number;
  jatuh_tempo: string;
  catatan: string;
}
export interface PembayaranBaru {
  kunci: string;
  nominal: number;
  tanggal_bayar: string;
  metode: "transfer" | "tunai";
  pengirim: string;
  bukti_path: string | null;
  catatan: string;
}
export function validasiTagihan(d: TagihanBaru) {
  angkaRupiah(String(d.nominal));
  if (
    !d.santri_ids.length ||
    d.santri_ids.length > 500 ||
    new Set(d.santri_ids).size !== d.santri_ids.length
  )
    throw Error("Pilih 1–500 santri, tanpa duplikat.");
  if (d.judul.trim().length < 3 || d.judul.trim().length > 160)
    throw Error("Judul harus 3–160 karakter.");
  if (!Object.hasOwn(JENIS_TAGIHAN, d.jenis))
    throw Error("Pilih jenis tagihan.");
  batasPeriode({ mode: "tanggal", nilai: d.periode });
  if (!d.periode.endsWith("-01"))
    throw Error("Periode harus hari pertama bulan tagihan.");
  batasPeriode({ mode: "tanggal", nilai: d.jatuh_tempo });
  if (d.catatan.length > 2000) throw Error("Catatan maksimal 2.000 karakter.");
}
export function validasiPembayaran(
  d: PembayaranBaru,
  tersedia: number,
  wali: boolean,
) {
  angkaRupiah(String(d.nominal));
  if (d.nominal > tersedia)
    throw Error("Nominal melebihi sisa yang dapat diajukan.");
  batasPeriode({ mode: "tanggal", nilai: d.tanggal_bayar });
  if (d.tanggal_bayar > hariWib())
    throw Error("Tanggal pembayaran tidak boleh di masa depan.");
  if (d.pengirim.trim().length < 3 || d.pengirim.trim().length > 120)
    throw Error("Nama pembayar harus 3–120 karakter.");
  if (!["transfer", "tunai"].includes(d.metode))
    throw Error("Pilih metode pembayaran.");
  if (wali && (d.metode !== "transfer" || !d.bukti_path))
    throw Error("Unggah bukti transfer terlebih dahulu.");
  if (d.catatan.length > 2000) throw Error("Catatan maksimal 2.000 karakter.");
}
export function progresPelunasan(tagihan: number, terbayar: number) {
  return tagihan > 0
    ? Math.max(0, Math.min(100, (terbayar / tagihan) * 100))
    : 0;
}
export function selCsv(v: unknown) {
  let s = String(v ?? "");
  if (/^(?:\s*[=+@\-]|[\t\r\n])/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
