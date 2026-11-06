import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import { ambilProfilLogin } from "@/lib/sesi";
import { kabariNotifikasi } from "@/lib/data/notifikasi";
import { batasPeriode, type FilterPeriode } from "@/lib/filter-periode";
import {
  validasiTagihan,
  type TagihanBaru,
  type PembayaranBaru,
  type JenisTagihan,
  type StatusTagihan,
  type StatusPembayaran,
  type AksiKeuangan,
} from "@/lib/keuangan";
export interface Tagihan {
  id: string;
  santri_id: string;
  santri_nama: string;
  kelas_nama: string;
  judul: string;
  jenis: JenisTagihan;
  periode: string;
  nominal: number;
  jatuh_tempo: string;
  catatan: string;
  status: "aktif" | "dibatalkan";
  revisi: number;
  terbayar: number;
  menunggu: number;
  sisa: number;
  status_bayar: StatusTagihan;
  terlambat: boolean;
}
export interface Pembayaran {
  id: string;
  nominal: number;
  tanggal_bayar: string;
  metode: string;
  pengirim: string;
  bukti_path: string | null;
  status: StatusPembayaran;
  pengaju_id: string | null;
  pengaju_nama: string;
  catatan: string;
  catatan_verifikasi: string;
  pemeriksa_nama: string | null;
  diperiksa_pada: string | null;
  created_at: string;
}
export interface DetailTagihan extends Tagihan {
  pembayaran: Pembayaran[];
  log: {
    id: number;
    aksi: string;
    pelaku_nama: string;
    catatan: string;
    waktu: string;
  }[];
}
export interface DaftarTagihan {
  jumlah: number;
  data: Tagihan[];
  ringkasan: {
    tagihan: number;
    terbayar: number;
    sisa: number;
    menunggu: number;
  };
}
async function rpc<T>(
  nama: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!supabaseTerhubung())
    throw Error("Keuangan tersedia setelah aplikasi terhubung ke server.");
  const { data, error } = await buatKlienBrowser().rpc(nama, args);
  if (error) {
    if (["PGRST202", "42P01"].includes(error.code))
      throw Error("Keuangan / SPP belum diaktifkan di server. Hubungi admin.");
    if (["23514", "23502", "22P02", "22007", "22008"].includes(error.code))
      throw Error(
        "Format data belum valid. Periksa nominal, tanggal, dan kelengkapan formulir.",
      );
    throw Error(error.message);
  }
  return data as T;
}
export function daftarTagihan(
  status: string,
  periode: FilterPeriode,
  cari: string,
  halaman: number,
) {
  const b = batasPeriode(periode);
  return rpc<DaftarTagihan>("daftar_tagihan", {
    p_status: status,
    p_mulai: b?.mulai ?? null,
    p_selesai: b?.selesai ?? null,
    p_cari: cari,
    p_halaman: halaman,
  });
}
export async function detailTagihan(id: string) {
  const d = await rpc<DetailTagihan | null>("detail_tagihan", { p_id: id });
  if (!d) throw Error("Tagihan tidak tersedia untuk akun ini.");
  return d;
}
export async function terbitkanTagihan(d: TagihanBaru) {
  validasiTagihan(d);
  const r = await rpc<{ dibuat: number; dilewati: number }>(
    "terbitkan_tagihan",
    { p_data: d },
  );
  kabariNotifikasi();
  return r;
}
export async function kirimPembayaran(
  id: string,
  revisi: number,
  d: PembayaranBaru,
) {
  const r = await rpc<string>("kirim_pembayaran", {
    p_id: id,
    p_revisi: revisi,
    p_data: d,
  });
  kabariNotifikasi();
  return r;
}
export async function aksiKeuangan(
  id: string,
  revisi: number,
  aksi: AksiKeuangan,
  bayar: string | null,
  catatan: string,
) {
  await rpc("aksi_keuangan", {
    p_id: id,
    p_revisi: revisi,
    p_aksi: aksi,
    p_bayar: bayar,
    p_catatan: catatan,
  });
  kabariNotifikasi();
}
export async function bacaKeuangan(id: string, revisi: number) {
  await rpc("baca_keuangan", { p_id: id, p_revisi: revisi });
  kabariNotifikasi();
}
export async function unggahBukti(blob: Blob) {
  const db = buatKlienBrowser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw Error("Silakan masuk kembali.");
  const path = `${user.id}/${crypto.randomUUID()}.webp`;
  const { error } = await db.storage
    .from("keuangan-bukti")
    .upload(path, blob, { contentType: "image/webp", upsert: false });
  if (error) throw Error("Bukti gagal diunggah. Coba lagi.");
  return path;
}
export async function urlBukti(path: string) {
  const { data, error } = await buatKlienBrowser()
    .storage.from("keuangan-bukti")
    .createSignedUrl(path, 300);
  if (error) throw Error("Bukti belum dapat dibuka.");
  return data.signedUrl;
}
export interface PilihanSantri {
  id: string;
  nama: string;
  kelas_id: string;
  kelas_nama: string;
}
export async function santriTagihan(): Promise<PilihanSantri[]> {
  if ((await ambilProfilLogin())?.peran !== "admin")
    throw Error("Pilihan penerbitan khusus admin.");
  const db = buatKlienBrowser(),
    hasil: PilihanSantri[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await db
      .from("santri")
      .select("id,nama,kelas_id,kelas(nama)")
      .eq("status_aktif", true)
      .order("id")
      .range(page * 500, page * 500 + 499);
    if (error) throw Error("Pilihan santri belum dapat dimuat.");
    const rows = data as unknown as {
      id: string;
      nama: string;
      kelas_id: string;
      kelas: { nama: string } | null;
    }[];
    hasil.push(
      ...rows.map((r) => ({
        id: r.id,
        nama: r.nama,
        kelas_id: r.kelas_id,
        kelas_nama: r.kelas?.nama ?? "Tanpa kelas",
      })),
    );
    if (rows.length < 500)
      return hasil.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }
  throw Error(
    "Daftar terlalu besar untuk formulir ini. Hubungi pengelola aplikasi.",
  );
}
