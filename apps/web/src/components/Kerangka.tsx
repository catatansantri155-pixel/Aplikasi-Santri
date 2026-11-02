import Link from "next/link";
import type { ReactNode } from "react";
import InfoPengguna from "@/components/InfoPengguna";

export const TAUTAN_NAV = [
  { href: "/", label: "Beranda", ikon: "⌂" },
  { href: "/santri", label: "Santri", ikon: "☰" },
  { href: "/kehadiran", label: "Kehadiran", ikon: "✓" },
  { href: "/hifzh", label: "Hifzh", ikon: "۞" },
  { href: "/diniyyah", label: "Diniyyah", ikon: "✎" },
  { href: "/catatan", label: "Catatan", ikon: "✉" },
  { href: "/rekap", label: "Rekap", ikon: "▦" },
] as const;

function DaftarTautan() {
  return (
    <>
      {TAUTAN_NAV.map((tautan) => (
        <Link key={tautan.href} href={tautan.href} className="nav-tautan">
          <span className="nav-ikon" aria-hidden="true">
            {tautan.ikon}
          </span>
          <span>{tautan.label}</span>
        </Link>
      ))}
    </>
  );
}

export default function Kerangka({ children }: { children: ReactNode }) {
  return (
    <div className="kerangka">
      <aside className="sidebar">
        <div className="merek">
          <p className="merek-nama">Aplikasi Santri</p>
          <p className="merek-sub">
            Ponpes Minhajus Sunnah Magelang
            <br />
            Marhalah Wustha
          </p>
        </div>
        <nav className="nav-samping" aria-label="Navigasi utama">
          <DaftarTautan />
        </nav>
        <InfoPengguna varian="samping" />
      </aside>

      <div className="kolom-utama">
        <header className="kepala">
          <div>
            <p className="kepala-nama">Aplikasi Santri</p>
            <p className="kepala-sub">
              Ponpes Minhajus Sunnah · Marhalah Wustha
            </p>
          </div>
          <InfoPengguna varian="kepala" />
        </header>

        <main className="konten">{children}</main>

        <nav className="nav-bawah" aria-label="Navigasi bawah">
          <DaftarTautan />
        </nav>
      </div>
    </div>
  );
}
