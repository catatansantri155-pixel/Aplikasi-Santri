"use client";

/**
 * Daftar tautan navigasi utama (sidebar & navigasi bawah), disaring
 * per peran memakai peta terpusat src/lib/akses.ts.
 *
 * MODE CONTOH (env Supabase kosong): semua tautan tampil persis seperti
 * sebelumnya — perilaku mode contoh tidak berubah.
 *
 * MODE SUPABASE:
 * - Selama profil login belum diketahui, hanya tautan modul yang boleh
 *   dibuka SEMUA peran yang dirender (beranda & santri), agar menu
 *   terbatas tidak sempat berkedip tampil untuk peran yang dilarang.
 * - Setelah profil diketahui, tautan disaring dengan bolehAksesModul():
 *   menu modul yang tidak berhak dibuka peran itu tidak tampil sama
 *   sekali (halamannya sendiri juga menolak lewat PenjagaModul).
 * - Profil DIPERIKSA ULANG setiap perpindahan halaman dan setiap
 *   peristiwa masuk/keluar: komponen ini hidup di layout akar yang
 *   TIDAK di-remount antar navigasi, jadi profil yang diambil sekali
 *   saat mount akan basi setelah keluar lalu masuk lagi sebagai akun
 *   lain — menu peran akun sebelumnya sempat tampil untuk akun
 *   berikutnya (cacat uji live 3 Nov 2026). Pemeriksaan membandingkan
 *   id sesi aktif dengan id profil yang tersimpan: sama → profil lama
 *   dipertahankan (tanpa kedipan); beda/kosong → keadaan kembali ke
 *   "belum diketahui" dulu, baru profil sesi baru dibaca.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  bolehAksesModul,
  modulUntukSemuaPeran,
  type KunciModul,
} from "@/lib/akses";
import { supabaseTerhubung } from "@/lib/data/santri";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import { Ikon, type NamaIkon } from "@/components/Ikon";

export const TAUTAN_NAV: {
  href: string;
  label: string;
  ikon: NamaIkon;
  modul: KunciModul;
}[] = [
  { href: "/", label: "Beranda", ikon: "beranda", modul: "beranda" },
  { href: "/santri", label: "Santri", ikon: "santri", modul: "santri" },
  { href: "/kehadiran", label: "Kehadiran", ikon: "kehadiran", modul: "kehadiran" },
  { href: "/hifzh", label: "Hifzh", ikon: "hifzh", modul: "hifzh" },
  { href: "/diniyyah", label: "Diniyyah", ikon: "diniyyah", modul: "diniyyah" },
  { href: "/olahraga", label: "Olahraga", ikon: "olahraga", modul: "olahraga" },
  { href: "/catatan", label: "Catatan", ikon: "catatan", modul: "catatan" },
  { href: "/laporan", label: "Laporan", ikon: "rekap", modul: "laporan" },
  { href: "/admin", label: "Admin", ikon: "perisai", modul: "admin" },
];

export default function NavTautan() {
  const modeContoh = !supabaseTerhubung();
  const pathname = usePathname();
  const [profil, setProfil] = useState<ProfilLogin | null>(null);
  const [cekSelesai, setCekSelesai] = useState(modeContoh);
  // Salinan profil terakhir yang dimuat, dibaca dari dalam async
  // tanpa memicu render ulang: dipakai membandingkan id sesi aktif.
  const profilRef = useRef<ProfilLogin | null>(null);

  useEffect(() => {
    if (modeContoh) return;
    let aktif = true;
    const supabase = buatKlienBrowser();

    const periksaSesi = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!aktif) return;
      const idSesi = session?.user?.id ?? null;

      if (!idSesi) {
        // Tidak ada sesi aktif: tidak ada profil yang berlaku.
        profilRef.current = null;
        setProfil(null);
        setCekSelesai(true);
        return;
      }
      if (profilRef.current && profilRef.current.id === idSesi) {
        // Profil sesi yang sama sudah dimuat — jangan ambil ulang,
        // supaya menu tidak berkedip di setiap perpindahan halaman.
        setCekSelesai(true);
        return;
      }
      // Sesi baru atau berganti akun: profil lama TIDAK berlaku.
      // Kembalikan ke keadaan "belum diketahui" (navigasi hanya
      // menampilkan Beranda & Santri) sebelum profil sesi ini dibaca.
      profilRef.current = null;
      setProfil(null);
      setCekSelesai(false);
      const p = await ambilProfilLogin();
      if (!aktif) return;
      profilRef.current = p;
      setProfil(p);
      setCekSelesai(true);
    };

    void periksaSesi();
    // Masuk/keluar dari komponen lain memicu navigasi (sudah tercakup
    // pemeriksaan per-pathname di atas); langganan ini pengaman ekstra
    // untuk peristiwa auth yang terjadi tanpa perpindahan halaman.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((peristiwa) => {
      if (
        peristiwa === "SIGNED_IN" ||
        peristiwa === "SIGNED_OUT" ||
        peristiwa === "USER_UPDATED"
      ) {
        void periksaSesi();
      }
    });
    return () => {
      aktif = false;
      subscription.unsubscribe();
    };
  }, [modeContoh, pathname]);

  const tautanTampil = TAUTAN_NAV.filter((tautan) => {
    if (modeContoh) return true;
    if (!cekSelesai || !profil) {
      // Profil belum diketahui: tampilkan hanya yang aman untuk semua.
      return modulUntukSemuaPeran(tautan.modul);
    }
    return bolehAksesModul(profil.peran, tautan.modul);
  });

  return (
    <>
      {tautanTampil.map((tautan) => {
        // State aktif (tampilan saja): beranda hanya pada "/" persis,
        // modul lain aktif juga pada halaman turunannya.
        const aktif =
          tautan.href === "/"
            ? pathname === "/"
            : pathname === tautan.href ||
              pathname.startsWith(`${tautan.href}/`);
        return (
          <Link
            key={tautan.href}
            href={tautan.href}
            className={`nav-tautan${aktif ? " nav-tautan--aktif" : ""}`}
            aria-current={aktif ? "page" : undefined}
          >
            <span className="nav-ikon" aria-hidden="true">
              <Ikon nama={tautan.ikon} ukuran={21} />
            </span>
            <span>{tautan.label}</span>
          </Link>
        );
      })}
    </>
  );
}
