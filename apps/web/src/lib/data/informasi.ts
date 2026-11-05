import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import {
  batasPeriode,
  type FilterPeriode,
  SEMUA_PERIODE,
} from "@/lib/filter-periode";
export const KATEGORI_INFORMASI = [
  "Pengumuman",
  "Kegiatan",
  "Jadwal",
  "Informasi",
] as const;
export interface InformasiPondok {
  id: string;
  judul: string;
  isi: string;
  kategori: string;
  status: "draf" | "terbit";
  tanggal: string;
  created_at: string;
  updated_at: string;
}
export type IsianInformasi = Pick<
  InformasiPondok,
  "judul" | "isi" | "kategori" | "status" | "tanggal"
>;
const KOLOM = "id,judul,isi,kategori,status,tanggal,created_at,updated_at";
export function validasiInformasi(v: IsianInformasi): IsianInformasi {
  const judul = v.judul.trim(),
    isi = v.isi.trim();
  if (judul.length < 3 || judul.length > 150)
    throw Error("Judul harus 3–150 karakter.");
  if (isi.length < 10 || isi.length > 12000)
    throw Error("Isi informasi harus 10–12.000 karakter.");
  if (
    !KATEGORI_INFORMASI.includes(
      v.kategori as (typeof KATEGORI_INFORMASI)[number],
    )
  )
    throw Error("Kategori tidak valid.");
  if (!["draf", "terbit"].includes(v.status))
    throw Error("Status tidak valid.");
  batasPeriode({ mode: "tanggal", nilai: v.tanggal });
  return { ...v, judul, isi };
}
export async function ambilInformasi({
  filter = SEMUA_PERIODE,
  halaman = 0,
  ringkas = false,
}: { filter?: FilterPeriode; halaman?: number; ringkas?: boolean } = {}) {
  const b = batasPeriode(filter);
  if (!supabaseTerhubung()) return { data: [] as InformasiPondok[], jumlah: 0 };
  const batas = ringkas ? 3 : 20;
  let q = buatKlienBrowser()
    .from("informasi_pondok")
    .select(KOLOM, { count: "exact" })
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });
  if (ringkas) q = q.eq("status", "terbit");
  if (b) q = q.gte("tanggal", b.mulai).lte("tanggal", b.selesai);
  const { data, error, count } = await q.range(
    halaman * batas,
    halaman * batas + batas - 1,
  );
  if (error) throw Error("Informasi pondok belum dapat dimuat. Coba lagi.");
  return { data: (data ?? []) as InformasiPondok[], jumlah: count ?? 0 };
}
export async function simpanInformasi(v: IsianInformasi, id?: string) {
  const nilai = validasiInformasi(v);
  if (!supabaseTerhubung())
    throw Error("Penyimpanan belum aktif pada mode contoh.");
  const db = buatKlienBrowser();
  const q = id
    ? db.from("informasi_pondok").update(nilai).eq("id", id)
    : db.from("informasi_pondok").insert(nilai);
  const { error, data } = await q.select(KOLOM).single();
  if (error)
    throw Error(
      "Informasi belum tersimpan. Pastikan akun Anda Admin Utama dan coba lagi.",
    );
  return data as InformasiPondok;
}
