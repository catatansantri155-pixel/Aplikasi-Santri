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
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import InfoPengguna from "@/components/InfoPengguna";
import NavTautan from "@/components/NavTautan";
import NavBawah from "@/components/NavBawah";
import { supabaseTerhubung } from "@/lib/data/santri";
import { ambilProfilLogin } from "@/lib/sesi";

export default function Kerangka({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  /* Beranda (audit Fase 3): blok identitas di kepala HP disembunyikan
     karena pita sapaan beranda sudah memuat identitas yang sama —
     identitas tampil dua kali itu mubazir. Kepala hanya ada di HP
     (di desktop digantikan sidebar). Kepala BARU disembunyikan
     setelah profil login terkonfirmasi ada: bagi pengunjung yang
     belum masuk, isi kepala adalah tautan "Masuk" — pintu masuk
     utama — yang tidak boleh hilang. Mode contoh tidak pernah
     menyembunyikan (tidak ada sesi; isinya selalu tautan "Masuk"). */
  const [sudahMasuk, setSudahMasuk] = useState(false);
  useEffect(() => {
    if (!supabaseTerhubung() || pathname !== "/") return;
    let batal = false;
    ambilProfilLogin().then((p) => {
      if (!batal) setSudahMasuk(Boolean(p));
    });
    return () => {
      batal = true;
    };
  }, [pathname]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const sembunyikanKepala = pathname === "/" && sudahMasuk;

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
        {!sembunyikanKepala && (
          <header className="kepala">
            <InfoPengguna varian="kepala" />
          </header>
        )}

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
