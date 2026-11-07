"use client";

/**
 * Kerangka ruang kerja: sidebar desktop, bilah identitas ringkas,
 * dan navigasi mobile sesuai peran. Halaman autentikasi memakai
 * ruang penuh; pemeriksaan sesi tetap dijalankan InfoPengguna.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { Ikon } from "@/components/Ikon";
import { usePathname } from "next/navigation";
import InfoPengguna from "@/components/InfoPengguna";
import Logo from "@/components/Logo";
import NavTautan from "@/components/NavTautan";
import LoncengNotifikasi from "@/components/LoncengNotifikasi";
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

  const halaman = pathname.split("/")[1] || "beranda";
  const namaHalaman: Record<string, string> = {
    beranda: "Beranda",
    santri: "Data santri",
    kehadiran: "Kehadiran",
    hifzh: "Hifzh",
    diniyyah: "Diniyyah",
    olahraga: "Olahraga",
    catatan: "Catatan",
    laporan: "Laporan",
    admin: "Administrasi",
    akun: "Akun",
    lainnya: "Lainnya",
    kalender: "Kalender Pondok",
    kesehatan: "Kesehatan Santri",
    banner: "Kelola Banner",
    perizinan: "Perizinan Santri",
    keuangan: "Keuangan Santri / SPP",
    informasi: "Informasi pondok",
    notifikasi: "Notifikasi",
  };

  return (
    <div className="kerangka" data-halaman={halaman}>
      <a className="lewati-konten" href="#konten">
        Lewati ke konten
      </a>
      <aside className="sidebar">
        <div className="sidebar-merek">
          <Logo ukuran={36} />
          <span className="sidebar-merek-teks">
            <span className="sidebar-merek-nama">Monitoring Santri</span>
            <span className="sidebar-merek-sub">Marhalah Wustha</span>
          </span>
        </div>
        <p className="sidebar-keterangan">RUANG KERJA</p>
        <nav
          data-panduan="navigasi-pc"
          className="nav-samping"
          aria-label="Navigasi utama"
        >
          <NavTautan />
        </nav>
        <InfoPengguna varian="samping" />
      </aside>

      <div className="kolom-utama">
        <header className="bilah-aplikasi">
          <Link
            href="/"
            className="merek-mobile"
            aria-label="Beranda Monitoring Santri"
          >
            <Logo ukuran={28} />
            <span>
              Minhajus Sunnah
              <span className="merek-mobile-sub">Monitoring santri</span>
            </span>
          </Link>
          <div className="jejak-halaman">
            <span>Ruang kerja</span>
            <Ikon nama="chevron-kanan" ukuran={14} />
            <strong>{namaHalaman[halaman] ?? "Aplikasi Santri"}</strong>
          </div>
          <LoncengNotifikasi />
        </header>
        <main className="konten" id="konten" tabIndex={-1}>
          {children}
        </main>

        <nav
          data-panduan="navigasi-mobile"
          className="nav-bawah"
          aria-label="Navigasi bawah"
        >
          <div className="nav-bawah-dalam">
            <NavBawah />
          </div>
        </nav>
      </div>
    </div>
  );
}
