import type { ReactNode } from "react";
import InfoPengguna from "@/components/InfoPengguna";
import NavTautan from "@/components/NavTautan";

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

        <main className="konten">{children}</main>

        <nav className="nav-bawah" aria-label="Navigasi bawah">
          <NavTautan />
        </nav>
      </div>
    </div>
  );
}
