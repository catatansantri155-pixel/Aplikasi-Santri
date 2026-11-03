/**
 * Halaman Laporan — Fase 2 audit (keputusan user 3 Nov 2026 21:03
 * mengikuti usulan audit): Rekap dan Grafik DILEBUR menjadi satu
 * pintu dengan dua tampilan:
 *
 * - "Ringkasan visual" (?tab=visual, bawaan): enam grafik dari
 *   komponen bersama KontenGrafik (bekas halaman /grafik).
 * - "Rincian tabel" (?tab=tabel): tabel rekap pekanan/semester/per
 *   kelas dari komponen bersama KontenRekap (bekas halaman /rekap).
 *
 * Tab dibaca dari query URL lewat prop searchParams halaman
 * (komponen server) dan tab berpindah lewat tautan ber-query, jadi
 * URL selalu mencerminkan tab aktif: refresh, tombol kembali, dan
 * tautan yang dibagikan mempertahankan tampilan yang sedang dibuka.
 * Tautan lama /grafik dan /rekap mengalihkan ke halaman ini (lihat
 * kedua halaman pengalihan itu).
 *
 * Gerbang peran: modul "laporan" untuk semua peran yang login
 * (src/lib/akses.ts). Semua angka berasal dari lapisan data yang
 * menghormati RLS — wali hanya melihat agregat anaknya sendiri.
 */
import Link from "next/link";
import PenjagaModul from "@/components/PenjagaModul";
import KontenGrafik from "@/components/KontenGrafik";
import KontenRekap from "@/components/KontenRekap";

type TabLaporan = "visual" | "tabel";

const DAFTAR_TAB: {
  kunci: TabLaporan;
  label: string;
  href: string;
}[] = [
  { kunci: "visual", label: "Ringkasan visual", href: "/laporan" },
  { kunci: "tabel", label: "Rincian tabel", href: "/laporan?tab=tabel" },
];

export default async function HalamanLaporan({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab: tabMentah } = await searchParams;
  const tab: TabLaporan = tabMentah === "tabel" ? "tabel" : "visual";

  return (
    <PenjagaModul modul="laporan">
      <h1 className="judul-halaman">Laporan</h1>
      <p className="subjudul">
        Ringkasan visual dan rincian tabel kehadiran, hifzh, diniyyah,
        dan olahraga dari data yang bisa Anda akses.
      </p>

      <div role="tablist" aria-label="Tampilan laporan" className="tab-pil">
        {DAFTAR_TAB.map((t) => {
          const aktif = tab === t.kunci;
          return (
            <Link
              key={t.kunci}
              role="tab"
              id={`tab-laporan-${t.kunci}`}
              aria-selected={aktif}
              aria-current={aktif ? "page" : undefined}
              aria-controls={`panel-laporan-${t.kunci}`}
              href={t.href}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-laporan-${tab}`}
        aria-labelledby={`tab-laporan-${tab}`}
      >
        {tab === "visual" ? <KontenGrafik /> : <KontenRekap />}
      </div>
    </PenjagaModul>
  );
}
