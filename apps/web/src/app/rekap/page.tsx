/**
 * Pengalihan warisan (Fase 2 audit, 3 Nov 2026): halaman Rekap
 * dilebur ke /laporan (tampilan "Rincian tabel"). Tautan lama
 * /rekap tidak mati — dialihkan ke pintu Laporan tab tabel.
 */
import { redirect } from "next/navigation";

export default function HalamanRekap() {
  redirect("/laporan?tab=tabel");
}
