"use client";

/**
 * Daftar tautan navigasi utama (sidebar & navigasi bawah), disaring
 * per peran memakai peta terpusat src/lib/akses.ts.
 *
 * MODE CONTOH (env Supabase kosong): semua tautan tampil persis seperti
 * sebelumnya — perilaku mode contoh tidak berubah.
 *
 * MODE SUPABASE:
 * - Selama profil login belum termuat, hanya tautan modul yang boleh
 *   dibuka SEMUA peran yang dirender (beranda & santri), agar menu
 *   terbatas tidak sempat berkedip tampil untuk peran yang dilarang.
 * - Setelah profil termuat, tautan disaring dengan bolehAksesModul():
 *   menu modul yang tidak berhak dibuka peran itu tidak tampil sama
 *   sekali (halamannya sendiri juga menolak lewat PenjagaModul).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  bolehAksesModul,
  modulUntukSemuaPeran,
  type KunciModul,
} from "@/lib/akses";
import { supabaseTerhubung } from "@/lib/data/santri";
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
  { href: "/catatan", label: "Catatan", ikon: "catatan", modul: "catatan" },
  { href: "/rekap", label: "Rekap", ikon: "rekap", modul: "rekap" },
];

export default function NavTautan() {
  const modeContoh = !supabaseTerhubung();
  const pathname = usePathname();
  const [profil, setProfil] = useState<ProfilLogin | null>(null);
  const [cekSelesai, setCekSelesai] = useState(modeContoh);

  useEffect(() => {
    if (modeContoh) return;
    let aktif = true;
    (async () => {
      const p = await ambilProfilLogin();
      if (!aktif) return;
      setProfil(p);
      setCekSelesai(true);
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh]);

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
