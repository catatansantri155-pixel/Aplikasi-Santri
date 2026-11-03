/**
 * Pengalihan warisan (Fase 2 audit, 3 Nov 2026): halaman Grafik
 * dilebur ke /laporan (tampilan "Ringkasan visual"). Tautan lama
 * /grafik tidak mati — dialihkan ke pintu Laporan.
 */
import { redirect } from "next/navigation";

export default function HalamanGrafik() {
  redirect("/laporan");
}
