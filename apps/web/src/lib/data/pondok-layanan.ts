import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import { batasBulan } from "@/lib/pondok-layanan";
import { batasPeriode, type FilterPeriode } from "@/lib/filter-periode";
import { kabariNotifikasi } from "@/lib/data/notifikasi";
export const PONDOK_BERUBAH = "santri:pondok-berubah";
export interface DasarLayanan {
  id: string;
  kunci: string;
  revisi: number;
  dihapus_pada: string | null;
}
export interface Agenda extends DasarLayanan {
  judul: string;
  deskripsi: string;
  lokasi: string;
  mulai: string;
  selesai: string;
  jenis: string;
  kelas_id: string | null;
  kelas_nama?: string;
}
export interface CatatanSehat extends DasarLayanan {
  santri_id: string;
  santri_nama: string;
  kelas_nama: string;
  tanggal: string;
  keluhan: string;
  tindakan: string;
  rujukan: string;
  status: "dipantau" | "dirujuk" | "pulih";
  petugas_nama: string;
}
export interface BannerPondok extends DasarLayanan {
  judul: string;
  bawaan: number | null;
  gambar_path: string | null;
  urutan: number;
  tayang: boolean;
  gambar_url?: string;
}
function cek() {
  if (!supabaseTerhubung())
    throw Error("Layanan tersedia setelah aplikasi terhubung ke server.");
  return buatKlienBrowser();
}
function galat(e: { code?: string; message: string } | null) {
  if (e)
    throw Error(
      ["PGRST202", "42P01", "42703"].includes(e.code ?? "")
        ? "Layanan belum tersedia di server. Coba muat ulang."
        : ["23514", "23502", "22P02", "22007", "23503"].includes(e.code ?? "")
          ? "Periksa kelengkapan data dan format tanggal."
          : e.message,
    );
}
export async function ambilAgenda(
  bulan: string,
  arsip = false,
): Promise<Agenda[]> {
  const b = batasBulan(bulan);
  let q = cek()
    .from("kalender_pondok")
    .select("*,kelas(nama)")
    .lt("mulai", b.selesai)
    .gt("selesai", b.mulai)
    .order("mulai")
    .order("id")
    .limit(501);
  q = arsip ? q.not("dihapus_pada", "is", null) : q.is("dihapus_pada", null);
  const { data, error } = await q;
  galat(error);
  if ((data?.length ?? 0) > 500)
    throw Error("Agenda bulan ini melebihi 500 entri. Hubungi admin.");
  return (data ?? []).map((x) => ({
    ...x,
    kelas_nama: (x.kelas as { nama: string } | null)?.nama,
  }));
}
export async function pilihanKelas() {
  const { data, error } = await cek()
    .from("kelas")
    .select("id,nama")
    .order("tingkat");
  galat(error);
  return (data ?? []) as { id: string; nama: string }[];
}
export async function ambilSehat(
  periode: FilterPeriode,
  status: string,
  cari: string,
  arsip: boolean,
  halaman: number,
): Promise<{ jumlah: number; data: CatatanSehat[] }> {
  const b = batasPeriode(periode);
  const { data, error } = await cek().rpc("daftar_kesehatan", {
    p_mulai: b?.mulai ?? null,
    p_selesai: b?.selesai ?? null,
    p_status: status,
    p_cari: cari,
    p_arsip: arsip,
    p_halaman: halaman,
  });
  galat(error);
  return data;
}
export async function simpanLayanan(
  modul: "kalender" | "kesehatan" | "banner",
  data: Record<string, unknown>,
  id: string | null,
  revisi: number,
) {
  const { data: r, error } = await cek().rpc(`simpan_${modul}`, {
    p_data: data,
    p_id: id,
    p_revisi: revisi,
  });
  galat(error);
  return r as string;
}
export async function arsipPondok(
  modul: "kalender" | "kesehatan" | "banner" | "informasi",
  id: string,
  revisi: number,
  pulihkan = false,
) {
  const { error } = await cek().rpc("arsip_pondok", {
    p_modul: modul,
    p_id: id,
    p_revisi: revisi,
    p_pulihkan: pulihkan,
  });
  galat(error);
  kabariNotifikasi();
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(PONDOK_BERUBAH));
}
export async function riwayatSehat(id: string) {
  const { data, error } = await cek()
    .from("kesehatan_riwayat")
    .select("id,aksi,status,pelaku_nama,waktu")
    .eq("catatan_id", id)
    .order("id");
  galat(error);
  return (data ?? []) as {
    id: number;
    aksi: string;
    status: string;
    pelaku_nama: string;
    waktu: string;
  }[];
}
export async function ambilBanner(
  kelola = false,
  arsip = false,
  halaman = 0,
): Promise<BannerPondok[]> {
  const db = cek();
  let q = db
    .from("banner_pondok")
    .select("*")
    .order("urutan")
    .order("created_at")
    .order("id")
    .range(kelola ? halaman * 20 : 0, kelola ? halaman * 20 + 20 : 19);
  q = arsip ? q.not("dihapus_pada", "is", null) : q.is("dihapus_pada", null);
  if (!kelola) q = q.eq("tayang", true);
  const { data, error } = await q;
  galat(error);
  const rows = (data ?? []) as BannerPondok[],
    paths = rows.flatMap((b) => (b.gambar_path ? [b.gambar_path] : []));
  let urls: { path: string | null; signedUrl: string | null }[] = [];
  if (paths.length) {
    const res = await db.storage
      .from("banner-pondok")
      .createSignedUrls(paths, 3600);
    galat(res.error);
    urls = res.data ?? [];
  }
  return rows.map((b) => ({
    ...b,
    gambar_url: b.bawaan
      ? `/images/banner/suasana-${b.bawaan}.webp`
      : (urls.find((u) => u.path === b.gambar_path)?.signedUrl ?? undefined),
  }));
}
export async function unggahBanner(blob: Blob) {
  const db = cek();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw Error("Silakan masuk kembali.");
  const path = `${user.id}/${crypto.randomUUID()}.webp`;
  const { error } = await db.storage
    .from("banner-pondok")
    .upload(path, blob, { contentType: "image/webp", upsert: false });
  galat(error);
  return path;
}
