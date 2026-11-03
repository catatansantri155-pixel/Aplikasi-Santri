"use client";

/**
 * PENJAGA PER HALAMAN MODUL — gerbang tampilan berdasarkan peran,
 * memakai peta terpusat src/lib/akses.ts.
 *
 * MODE CONTOH (env Supabase kosong): children dirender apa adanya —
 * perilaku mode contoh tidak berubah sama sekali.
 *
 * MODE SUPABASE:
 * - Selama profil login belum termuat, isi modul TIDAK dirender
 *   (hanya penanda memuat), agar form/isi terbatas tidak berkedip.
 * - Bila tidak ada sesi/profil, dirender kosong: penjaga kerangka
 *   (InfoPengguna) sedang mengarahkan pengguna ke /login.
 * - Bila peran tidak berhak atas modul ini, yang tampil hanya kartu
 *   pesan penolakan — form dan isi modul tidak dirender sama sekali,
 *   termasuk saat modul dibuka lewat URL langsung.
 * - Bila berhak, children dirender normal.
 *
 * Gerbang ini level tampilan; penegakan sesungguhnya tetap RLS.
 */
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  PESAN_TIDAK_ADA_AKSES,
  bolehAksesModul,
  type KunciModul,
} from "@/lib/akses";
import { supabaseTerhubung } from "@/lib/data/santri";
import { LABEL_PERAN } from "@/lib/peran";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";

export default function PenjagaModul({
  modul,
  children,
}: {
  modul: KunciModul;
  children: ReactNode;
}) {
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

  if (modeContoh) return <>{children}</>;
  if (!cekSelesai) {
    return <p className="catatan-kaki">Memeriksa akses…</p>;
  }
  if (!profil) {
    // Tanpa sesi/profil: InfoPengguna mengarahkan ke /login; jangan
    // merender isi modul apa pun di sela pengalihan itu.
    return null;
  }
  if (!bolehAksesModul(profil.peran, modul)) {
    return (
      <section className="kartu">
        <h2>Akses dibatasi</h2>
        <p>
          {PESAN_TIDAK_ADA_AKSES} Anda masuk sebagai{" "}
          <strong>{LABEL_PERAN[profil.peran]}</strong> ({profil.nama}).
        </p>
        <p>
          <Link href="/">Kembali ke beranda</Link>
        </p>
      </section>
    );
  }
  return <>{children}</>;
}
