import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import { ambilProfilLogin } from "@/lib/sesi";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
export const NOTIFIKASI_BERUBAH = "santri:notifikasi-berubah";
export type SasaranInformasi =
  "semua" | "peran" | "kelas" | "santri" | "pengguna";
export const LABEL_SASARAN: Record<SasaranInformasi, string> = {
  semua: "Seluruh pengguna",
  peran: "Peran tertentu",
  kelas: "Wali satu kelas",
  santri: "Wali seorang santri",
  pengguna: "Satu akun",
};
export interface Notifikasi {
  sumber?: "informasi" | "perizinan";
  tujuan_id?: string;
  id: string;
  judul: string;
  kategori: string;
  tanggal: string;
  updated_at: string;
  disematkan: boolean;
  wajib_konfirmasi: boolean;
  revisi: number;
  dibaca_pada: string | null;
  dikonfirmasi_pada: string | null;
}
export function labelJumlah(n: number) {
  return n > 9 ? "9+" : String(n);
}
export function kabariNotifikasi() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(NOTIFIKASI_BERUBAH));
}
export async function jumlahBelumDibaca() {
  if (!supabaseTerhubung()) return 0;
  const { data, error } = await buatKlienBrowser().rpc(
    "jumlah_notifikasi_belum_dibaca",
  );
  if (error) throw Error("Jumlah notifikasi belum dapat dimuat.");
  return Number(data ?? 0);
}
export async function ambilNotifikasi(
  belum = false,
  halaman = 0,
): Promise<{ data: Notifikasi[]; jumlah: number; belum: number }> {
  if (!supabaseTerhubung()) return { data: [], jumlah: 0, belum: 0 };
  const { data, error } = await buatKlienBrowser().rpc("daftar_notifikasi", {
    p_belum: belum,
    p_halaman: halaman,
  });
  if (error) throw Error("Notifikasi belum dapat dimuat. Coba lagi.");
  return data as { data: Notifikasi[]; jumlah: number; belum: number };
}
export async function tandaiInformasi(
  id: string,
  revisi: number,
  konfirmasi = false,
) {
  if (!supabaseTerhubung()) return;
  const { error } = await buatKlienBrowser().rpc("tandai_informasi_versi", {
    p_id: id,
    p_revisi: revisi,
    p_konfirmasi: konfirmasi,
  });
  if (error)
    throw Error(
      "Status baca belum tersimpan. Informasi mungkin sudah berubah atau tidak tersedia.",
    );
  kabariNotifikasi();
}
export async function bacaSemuaInformasi() {
  if (!supabaseTerhubung()) return;
  const { error } = await buatKlienBrowser().rpc("baca_semua_informasi", {
    p_sebelum: new Date().toISOString(),
  });
  if (error) throw Error("Notifikasi belum berhasil ditandai. Coba lagi.");
  kabariNotifikasi();
}
export async function pilihanSasaran(
  mode: "kelas" | "santri" | "pengguna",
  cari: string,
  id?: string,
) {
  const profil = await ambilProfilLogin();
  if (profil?.peran !== "admin")
    throw Error("Pilihan penerima hanya tersedia untuk admin.");
  const db = buatKlienBrowser();
  const table = mode === "pengguna" ? "profiles" : mode;
  const kolom = mode === "pengguna" ? "id,nama,peran" : "id,nama";
  const q = cari
    .replace(/[\\%_]/g, " ")
    .trim()
    .slice(0, 80);
  const hasil = await db
    .from(table)
    .select(kolom)
    .ilike("nama", `%${q}%`)
    .order("nama")
    .limit(30);
  if (hasil.error) throw Error("Pilihan penerima belum dapat dimuat.");
  const baris = hasil.data as unknown as {
    id: string;
    nama: string;
    peran?: Peran;
  }[];
  if (id && !baris.some((b) => b.id === id)) {
    const r = await db.from(table).select(kolom).eq("id", id).maybeSingle();
    if (r.error) throw Error("Penerima terpilih belum dapat dimuat.");
    if (r.data) baris.unshift(r.data as unknown as (typeof baris)[number]);
  }
  return baris.map((b) => ({
    id: b.id,
    label: b.nama + (b.peran ? ` · ${LABEL_PERAN[b.peran]}` : ""),
  }));
}

export function tujuanNotifikasi(n: Notifikasi) {
  return n.sumber === "perizinan"
    ? `/perizinan/${n.tujuan_id}`
    : `/informasi/${n.id}`;
}
