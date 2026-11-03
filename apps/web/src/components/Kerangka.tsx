"use client";

/**
 * Kerangka aplikasi (revisi biru 3 Nov 2026): TIDAK ada lagi teks
 * merek "Aplikasi Santri / Ponpes Minhajus Sunnah" di header mobile
 * maupun sidebar — blok paling atas keduanya kini IDENTITAS
 * pengguna yang masuk (avatar + nama + peran dari InfoPengguna,
 * menaut ke /akun), bersih seperti halaman referensi UNPIX.
 * Tombol Keluar hanya ada di halaman Akun.
 *
 * HALAMAN LOGIN TANPA KERANGKA (audit Fase 1): pada /login, sidebar,
 * header, dan navigasi bawah TIDAK dirender sama sekali — pengguna
 * belum masuk tidak perlu melihat pilihan modul, dan formulir masuk
 * mendapat ruang penuh. Pemeriksaan sesi untuk /login (sudah masuk →
 * ke beranda; sesi ada tetapi profil belum disiapkan → pesan khusus)
 * ditangani halaman login sendiri.
 */
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import InfoPengguna from "@/components/InfoPengguna";
import NavTautan from "@/components/NavTautan";
import NavBawah from "@/components/NavBawah";

export default function Kerangka({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

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
