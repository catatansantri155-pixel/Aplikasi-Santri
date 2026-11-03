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
import {
  bolehAksesModul,
  modulUntukSemuaPeran,
  type KunciModul,
} from "@/lib/akses";
import { supabaseTerhubung } from "@/lib/data/santri";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";

export const TAUTAN_NAV: {
  href: string;
  label: string;
  ikon: string;
  modul: KunciModul;
}[] = [
  { href: "/", label: "Beranda", ikon: "⌂", modul: "beranda" },
  { href: "/santri", label: "Santri", ikon: "☰", modul: "santri" },
  { href: "/kehadiran", label: "Kehadiran", ikon: "✓", modul: "kehadiran" },
  { href: "/hifzh", label: "Hifzh", ikon: "۞", modul: "hifzh" },
  { href: "/diniyyah", label: "Diniyyah", ikon: "✎", modul: "diniyyah" },
  { href: "/catatan", label: "Catatan", ikon: "✉", modul: "catatan" },
  { href: "/rekap", label: "Rekap", ikon: "▦", modul: "rekap" },
];

export default function NavTautan() {
  const modeContoh = !supabaseTerhubung();
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
      {tautanTampil.map((tautan) => (
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
