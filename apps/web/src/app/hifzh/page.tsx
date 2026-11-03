/**
 * Halaman Hifzh — komponen server pembaca tab (audit Fase 3).
 *
 * Tiga tab: Setoran (?tab= bawaan), Riwayat (?tab=riwayat), dan
 * Ujian (?tab=ujian). Tab dibaca dari query URL lewat prop
 * searchParams dan diteruskan ke komponen klien IsiHifzh — pola
 * yang sama dengan halaman Laporan (Fase 2) — sehingga tab aktif
 * bertahan saat refresh, tombol kembali, dan tautan dibagikan.
 *
 * Gerbang peran modul (src/lib/akses.ts): hanya admin & pengajar
 * hifzh yang melihat isi halaman ini.
 */
import PenjagaModul from "@/components/PenjagaModul";
import IsiHalamanHifzh, { type TabHifzh } from "./IsiHifzh";

export default async function HalamanHifzh({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab: tabMentah } = await searchParams;
  const tab: TabHifzh =
    tabMentah === "riwayat"
      ? "riwayat"
      : tabMentah === "ujian"
        ? "ujian"
        : "setoran";

  return (
    <PenjagaModul modul="hifzh">
      <IsiHalamanHifzh tab={tab} />
    </PenjagaModul>
  );
}
