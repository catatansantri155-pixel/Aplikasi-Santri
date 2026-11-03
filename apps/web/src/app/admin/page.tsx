/**
 * Halaman Panel Admin — komponen server pembaca tab (audit Fase 3).
 *
 * Empat tab: Santri (?tab= bawaan), Semester (?tab=semester), Wali
 * (?tab=wali), dan Akun (?tab=akun, pembuatan akun oleh admin —
 * 4 Nov 2026). Tab dibaca dari query URL lewat prop searchParams dan
 * diteruskan ke komponen klien IsiAdmin — pola yang sama dengan
 * halaman Laporan (Fase 2).
 *
 * Gerbang peran: PenjagaModul modul "admin" (src/lib/akses.ts) —
 * hanya admin yang melihat isi halaman ini, termasuk lewat URL
 * langsung; penegakan asli tetap RLS di database.
 */
import PenjagaModul from "@/components/PenjagaModul";
import IsiHalamanAdmin, { type TabAdmin } from "./IsiAdmin";

export default async function HalamanAdmin({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab: tabMentah } = await searchParams;
  const tab: TabAdmin =
    tabMentah === "semester"
      ? "semester"
      : tabMentah === "wali"
        ? "wali"
        : tabMentah === "akun"
          ? "akun"
          : "santri";

  return (
    <PenjagaModul modul="admin">
      <IsiHalamanAdmin tab={tab} />
    </PenjagaModul>
  );
}
