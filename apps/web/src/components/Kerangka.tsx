import type { ReactNode } from "react";
import InfoPengguna from "@/components/InfoPengguna";
import NavTautan from "@/components/NavTautan";
import { Ikon } from "@/components/Ikon";

export default function Kerangka({ children }: { children: ReactNode }) {
  return (
    <div className="kerangka">
      <a className="lewati-konten" href="#konten">
        Lewati ke konten
      </a>
      <aside className="sidebar">
        <div className="merek">
          <span className="merek-logo">
            <Ikon nama="hifzh" ukuran={22} />
          </span>
          <div>
            <p className="merek-nama">Aplikasi Santri</p>
            <p className="merek-sub">
              Ponpes Minhajus Sunnah Magelang · Marhalah Wustha
            </p>
          </div>
        </div>
        <nav className="nav-samping" aria-label="Navigasi utama">
          <NavTautan />
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

        <main className="konten" id="konten" tabIndex={-1}>
          {children}
        </main>

        <nav className="nav-bawah" aria-label="Navigasi bawah">
          <NavTautan />
        </nav>
      </div>
    </div>
  );
}
