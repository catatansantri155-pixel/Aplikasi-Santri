import { SEMUA_PERAN } from "@/lib/peran";
import { kabariNotifikasi, type SasaranInformasi } from "./notifikasi";
import { BUCKET_INFORMASI, POLA_GAMBAR } from "./gambar-informasi";
import { TEMA_INFORMASI, type TemaInformasi } from "@/lib/template-informasi";
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
  tema: TemaInformasi;
  gambar_path: string | null;
  gambar_url?: string;
  dihapus_pada?: string | null;
  sasaran?: SasaranInformasi;
  sasaran_peran?: string | null;
  sasaran_id?: string | null;
  disematkan?: boolean;
  berakhir_pada?: string | null;
  wajib_konfirmasi?: boolean;
  revisi?: number;
}
export type IsianInformasi = Pick<
  InformasiPondok,
  "judul" | "isi" | "kategori" | "status" | "tanggal"
> &
  Partial<
    Pick<
      InformasiPondok,
      | "tema"
      | "gambar_path"
      | "sasaran"
      | "sasaran_peran"
      | "sasaran_id"
      | "disematkan"
      | "berakhir_pada"
      | "wajib_konfirmasi"
    >
  >;
const KOLOM =
  "id,judul,isi,kategori,status,tanggal,created_at,updated_at,tema,gambar_path,sasaran,sasaran_peran,sasaran_id,disematkan,berakhir_pada,wajib_konfirmasi,revisi,dihapus_pada";
export function validasiInformasi(v: IsianInformasi): IsianInformasi {
  const judul = v.judul.trim(),
    isi = v.isi.trim();
  if (judul.length < 3 || judul.length > 150)
    throw Error("Judul harus 3–150 karakter.");
  const gambar_path = v.gambar_path || null;
  if (gambar_path && !POLA_GAMBAR.test(gambar_path))
    throw Error("Gambar tidak valid. Unggah ulang gambar.");
  if ((!gambar_path && isi.length < 10) || isi.length > 12000)
    throw Error(
      "Isi minimal 10 karakter, atau tambahkan gambar. Maksimal 12.000 karakter.",
    );
  if (!TEMA_INFORMASI.includes(v.tema ?? "hijau"))
    throw Error("Tema tidak valid.");
  if (v.status === "terbit" && /\[[^\]]+\]/.test(judul + isi))
    throw Error(
      "Lengkapi bagian dalam tanda [ ] dari template sebelum diterbitkan.",
    );
  if (
    !KATEGORI_INFORMASI.includes(
      v.kategori as (typeof KATEGORI_INFORMASI)[number],
    )
  )
    throw Error("Kategori tidak valid.");
  if (!["draf", "terbit"].includes(v.status))
    throw Error("Status tidak valid.");
  batasPeriode({ mode: "tanggal", nilai: v.tanggal });
  const sasaran = v.sasaran ?? "semua";
  if (!["semua", "peran", "kelas", "santri", "pengguna"].includes(sasaran))
    throw Error("Sasaran informasi tidak valid.");
  if (
    sasaran === "peran" &&
    !SEMUA_PERAN.includes(v.sasaran_peran as (typeof SEMUA_PERAN)[number])
  )
    throw Error("Pilih peran penerima.");
  if (
    ["kelas", "santri", "pengguna"].includes(sasaran) &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      v.sasaran_id ?? "",
    )
  )
    throw Error("Pilih tujuan informasi.");
  if (v.berakhir_pada && !Number.isFinite(Date.parse(v.berakhir_pada)))
    throw Error("Batas masa tayang tidak valid.");
  return {
    sasaran,
    sasaran_peran: sasaran === "peran" ? v.sasaran_peran : null,
    sasaran_id: ["kelas", "santri", "pengguna"].includes(sasaran)
      ? v.sasaran_id
      : null,
    disematkan: Boolean(v.disematkan),
    berakhir_pada: v.berakhir_pada || null,
    wajib_konfirmasi: Boolean(v.wajib_konfirmasi),
    judul,
    isi,
    kategori: v.kategori,
    status: v.status,
    tanggal: v.tanggal,
    tema: v.tema ?? "hijau",
    gambar_path,
  };
}
export async function ambilInformasi({
  filter = SEMUA_PERIODE,
  halaman = 0,
  ringkas = false,
  arsip = false,
}: {
  filter?: FilterPeriode;
  halaman?: number;
  ringkas?: boolean;
  arsip?: boolean;
} = {}) {
  const b = batasPeriode(filter);
  if (!supabaseTerhubung()) return { data: [] as InformasiPondok[], jumlah: 0 };
  const batas = ringkas ? 3 : 20;
  let q = buatKlienBrowser()
    .from("informasi_pondok")
    .select(KOLOM, { count: "exact" })
    .order("disematkan", { ascending: false })
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });
  q = arsip ? q.not("dihapus_pada", "is", null) : q.is("dihapus_pada", null);
  if (ringkas) q = q.eq("status", "terbit");
  if (b) q = q.gte("tanggal", b.mulai).lte("tanggal", b.selesai);
  const { data, error, count } = await q.range(
    halaman * batas,
    halaman * batas + batas - 1,
  );
  if (error) throw Error("Informasi pondok belum dapat dimuat. Coba lagi.");
  const baris = (data ?? []) as InformasiPondok[];
  const paths = [
    ...new Set(baris.flatMap((b) => (b.gambar_path ? [b.gambar_path] : []))),
  ];
  if (paths.length) {
    const { data: urls } = await buatKlienBrowser()
      .storage.from(BUCKET_INFORMASI)
      .createSignedUrls(paths, 3600);
    for (const b of baris)
      b.gambar_url =
        urls?.find((u) => u.path === b.gambar_path)?.signedUrl ?? undefined;
  }
  return { data: baris, jumlah: count ?? 0 };
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
  kabariNotifikasi();
  return data as InformasiPondok;
}

export interface DetailInformasi extends InformasiPondok {
  untuk_saya: boolean;
  dibaca_pada: string | null;
  dikonfirmasi_pada: string | null;
}
export async function ambilDetailInformasi(
  id: string,
): Promise<DetailInformasi | null> {
  if (!supabaseTerhubung()) return null;
  const { data, error } = await buatKlienBrowser().rpc("detail_informasi", {
    p_id: id,
  });
  if (error) throw Error("Informasi belum dapat dimuat. Coba lagi.");
  if (!data) return null;
  const b = data as DetailInformasi;
  if (b.gambar_path) {
    const { data: url } = await buatKlienBrowser()
      .storage.from(BUCKET_INFORMASI)
      .createSignedUrl(b.gambar_path, 3600);
    b.gambar_url = url?.signedUrl;
  }
  return b;
}
export async function ringkasanBacaan(id: string, revisi: number) {
  const db = buatKlienBrowser();
  const [b, k] = await Promise.all([
    db
      .from("informasi_bacaan")
      .select("informasi_id", { count: "exact", head: true })
      .eq("informasi_id", id)
      .eq("revisi", revisi),
    db
      .from("informasi_bacaan")
      .select("informasi_id", { count: "exact", head: true })
      .eq("informasi_id", id)
      .eq("revisi", revisi)
      .not("dikonfirmasi_pada", "is", null),
  ]);
  if (b.error || k.error) throw Error("Ringkasan baca belum dapat dimuat.");
  return { dibaca: b.count ?? 0, dikonfirmasi: k.count ?? 0 };
}
