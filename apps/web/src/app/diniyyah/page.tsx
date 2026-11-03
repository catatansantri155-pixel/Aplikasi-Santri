/**
 * Halaman Diniyyah — komponen server pembaca tab (audit Fase 3).
 *
 * Tiga tab: Harian (?tab= bawaan), Ujian (?tab=ujian), dan
 * Ringkasan (?tab=ringkasan). Tab dibaca dari query URL lewat prop
 * searchParams dan diteruskan ke komponen klien IsiDiniyyah — pola
 * yang sama dengan halaman Laporan (Fase 2) — sehingga tab aktif
 * bertahan saat refresh, tombol kembali, dan tautan dibagikan.
 *
 * Gerbang peran modul (src/lib/akses.ts): hanya admin & pengajar
 * diniyyah yang melihat isi halaman ini.
 */
import PenjagaModul from "@/components/PenjagaModul";
import IsiHalamanDiniyyah, { type TabDiniyyah } from "./IsiDiniyyah";

export default async function HalamanDiniyyah({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab: tabMentah } = await searchParams;
  const tab: TabDiniyyah =
    tabMentah === "ujian"
      ? "ujian"
      : tabMentah === "ringkasan"
        ? "ringkasan"
        : "harian";

  return (
    <PenjagaModul modul="diniyyah">
      <IsiHalamanDiniyyah tab={tab} />
    </PenjagaModul>
  );
}
