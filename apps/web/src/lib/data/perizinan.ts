import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import { kabariNotifikasi } from "@/lib/data/notifikasi";
import {
  validasiPengajuan,
  type DataPengajuan,
  type StatusIzin,
  type AksiIzin,
} from "@/lib/perizinan";
import { batasPeriode, type FilterPeriode } from "@/lib/filter-periode";
export interface IzinRingkas {
  id: string;
  santri_id: string;
  santri_nama: string;
  kelas_nama: string;
  jenis: string;
  rencana_keluar: string;
  rencana_kembali: string;
  keluar_pada: string | null;
  kembali_pada: string | null;
  status: StatusIzin;
  pengaju_nama: string;
  updated_at: string;
  revisi: number;
  terlambat: boolean;
}
export interface IzinDetail extends IzinRingkas, DataPengajuan {
  pengaju_id: string | null;
  catatan_petugas: string;
  created_at: string;
  log: {
    id: number;
    pelaku_nama: string;
    aksi: string;
    status_ke: StatusIzin;
    catatan: string;
    waktu: string;
  }[];
}
export interface DaftarIzin {
  jumlah: number;
  ringkasan: {
    menunggu: number;
    disetujui: number;
    sedang_izin: number;
    terlambat: number;
  };
  data: IzinRingkas[];
}
async function rpc<T>(
  nama: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!supabaseTerhubung())
    throw Error("Perizinan tersedia setelah aplikasi terhubung ke server.");
  const { data, error } = await buatKlienBrowser().rpc(nama, args);
  if (error && ["23514", "23502", "22P02", "22007"].includes(error.code))
    throw Error(
      "Data belum lengkap atau formatnya tidak valid. Periksa kembali formulir pengajuan.",
    );
  if (error)
    throw Error(
      error.code === "PGRST202" || error.code === "42P01"
        ? "Fitur perizinan belum diaktifkan di server. Hubungi admin."
        : error.message,
    );
  return data as T;
}
export function daftarIzin(
  status: string,
  periode: FilterPeriode,
  halaman: number,
) {
  const b = batasPeriode(periode);
  return rpc<DaftarIzin>("daftar_perizinan", {
    p_status: status,
    p_mulai: b?.mulai ?? null,
    p_selesai: b?.selesai ?? null,
    p_halaman: halaman,
  });
}
export async function detailIzin(id: string) {
  const d = await rpc<IzinDetail | null>("detail_perizinan", { p_id: id });
  if (!d) throw Error("Pengajuan tidak tersedia untuk akun ini.");
  return d;
}
export async function simpanIzin(
  p: DataPengajuan,
  id: string | null = null,
  revisi = 0,
) {
  validasiPengajuan(p);
  const hasil = await rpc<string>("simpan_perizinan", {
    p_data: p,
    p_id: id,
    p_revisi: revisi,
  });
  kabariNotifikasi();
  return hasil;
}
export async function aksiIzin(
  id: string,
  revisi: number,
  aksi: AksiIzin,
  catatan: string,
) {
  await rpc("aksi_perizinan", {
    p_id: id,
    p_revisi: revisi,
    p_aksi: aksi,
    p_catatan: catatan,
  });
  kabariNotifikasi();
}
export async function bacaIzin(id: string, revisi: number) {
  await rpc("baca_notifikasi_izin", { p_id: id, p_revisi: revisi });
  kabariNotifikasi();
}
export async function urlLampiran(path: string) {
  const { data, error } = await buatKlienBrowser()
    .storage.from("perizinan-lampiran")
    .createSignedUrl(path, 300);
  if (error) throw Error("Lampiran belum dapat dibuka.");
  return data.signedUrl;
}
export async function unggahLampiran(blob: Blob) {
  const db = buatKlienBrowser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw Error("Silakan masuk kembali.");
  const path = `${user.id}/${crypto.randomUUID()}.webp`;
  const { error } = await db.storage
    .from("perizinan-lampiran")
    .upload(path, blob, { contentType: "image/webp", upsert: false });
  if (error) throw Error("Lampiran gagal diunggah. Coba lagi.");
  return path;
}
export async function bersihkanLampiran(path: string) {
  await buatKlienBrowser().storage.from("perizinan-lampiran").remove([path]);
}
