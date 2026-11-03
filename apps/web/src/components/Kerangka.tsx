import type { ReactNode } from "react";
import InfoPengguna from "@/components/InfoPengguna";
import NavTautan from "@/components/NavTautan";
import NavBawah from "@/components/NavBawah";

/**
 * Kerangka aplikasi (revisi biru 3 Nov 2026): TIDAK ada lagi teks
 * merek "Aplikasi Santri / Ponpes Minhajus Sunnah" di header mobile
 * maupun sidebar — blok paling atas keduanya kini IDENTITAS
 * pengguna yang masuk (avatar + nama + peran dari InfoPengguna,
 * menaut ke /akun), bersih seperti halaman referensi UNPIX.
 * Tombol Keluar hanya ada di halaman Akun.
 */
export default function Kerangka({ children }: { children: ReactNode }) {
  return (
    <div className="kerangka">
      <a className="lewati-konten" href="#konten">
        Lewati ke konten
      </a>
      <aside className="sidebar">
        <InfoPengguna varian="samping" />
        <nav className="nav-samping" aria-label="Navigasi utama">
          <NavTautan />
        </nav>
      </aside>

      <div className="kolom-utama">
        <header className="kepala">
          <InfoPengguna varian="kepala" />
        </header>

        <main className="konten" id="konten" tabIndex={-1}>
          {children}
        </main>

        <nav className="nav-bawah" aria-label="Navigasi bawah">
          <NavBawah />
        </nav>
      </div>
    </div>
  );
}
