"use client";

/**
 * Kerangka aplikasi — sejak penyelarasan prototipe (4 Nov 2026
 * sore) mengikuti prototipe Lovable: tanpa kepala HP; sidebar
 * desktop berisi blok merek (Logo + nama aplikasi) di atas,
 * navigasi di tengah, dan identitas pengguna teks polos
 * (InfoPengguna, menaut ke /akun) di dasar. Tombol Keluar hanya
 * ada di halaman Akun.
 *
 * HALAMAN LOGIN TANPA KERANGKA (audit Fase 1): pada /login, sidebar,
 * header, dan navigasi bawah TIDAK dirender sama sekali — pengguna
 * belum masuk tidak perlu melihat pilihan modul, dan formulir masuk
 * mendapat ruang penuh. Pemeriksaan sesi untuk /login (sudah masuk →
 * ke beranda; sesi ada tetapi profil belum disiapkan → pesan khusus)
 * ditangani halaman login sendiri.
 *
 * Halaman polos diperluas (4 Nov 2026): /sambutan (onboarding),
 * /daftar (sign up wali), /lupa-sandi, dan /atur-sandi memakai
 * perlakuan yang sama — semuanya halaman pra/di luar sesi.
 */
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import InfoPengguna from "@/components/InfoPengguna";
import Logo from "@/components/Logo";
import NavTautan from "@/components/NavTautan";
import NavBawah from "@/components/NavBawah";

/** Pathname halaman polos tanpa kerangka (pra-sesi / alur akun). */
const PATH_TANPA_KERANGKA = [
  "/login",
  "/sambutan",
  "/daftar",
  "/lupa-sandi",
  "/atur-sandi",
];

export default function Kerangka({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (PATH_TANPA_KERANGKA.includes(pathname)) {
    return <>{children}</>;
  }

  /* Kerangka mengikuti PROTOTIPE (penyelarasan 4 Nov 2026 sore):
     TIDAK ada kepala HP sama sekali; sidebar desktop = blok merek
     (logo + "Aplikasi Santri / Marhalah Wustha") di atas, navigasi
     di tengah, identitas pengguna teks polos di dasar. Penjaga
     halaman tetap hidup lewat InfoPengguna di sidebar (komponen
     terpasang walau sidebar tersembunyi secara CSS di HP). */

  return (
    <div className="kerangka">
      <a className="lewati-konten" href="#konten">
        Lewati ke konten
      </a>
      <aside className="sidebar">
        <div className="sidebar-merek">
          <Logo ukuran={36} />
          <span className="sidebar-merek-teks">
            <span className="sidebar-merek-nama">Aplikasi Santri</span>
            <span className="sidebar-merek-sub">Marhalah Wustha</span>
          </span>
        </div>
        <nav className="nav-samping" aria-label="Navigasi utama">
          <NavTautan />
        </nav>
        <InfoPengguna varian="samping" />
      </aside>

      <div className="kolom-utama">
        <main className="konten" id="konten" tabIndex={-1}>
          {children}
        </main>

        <nav className="nav-bawah" aria-label="Navigasi bawah">
          <div className="nav-bawah-dalam">
            <NavBawah />
          </div>
        </nav>
      </div>
    </div>
  );
}
