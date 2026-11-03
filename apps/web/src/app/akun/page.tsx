"use client";

/**
 * Halaman Akun — profil pengguna yang login: avatar inisial besar,
 * nama, peran, surel, penjelasan hak akses peran dalam bahasa polos,
 * dan tombol Keluar (mekanisme sesi bersama lib/sesi.ts:
 * keluarDariSesi). Sejak revisi biru 3 Nov 2026, tombol Keluar
 * HANYA ada di halaman ini — kerangka (kepala & sidebar) hanya
 * menampilkan blok identitas yang menaut ke sini.
 *
 * Boleh dibuka semua peran yang login (modul "akun" di peta akses =
 * semua peran); isinya hanya data profil sendiri. MODE CONTOH tidak
 * punya sesi asli, jadi yang tampil kartu penjelasan mode contoh.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PenandaTahap from "@/components/PenandaTahap";
import PenjagaModul from "@/components/PenjagaModul";
import AvatarInisial from "@/components/AvatarInisial";
import { Ikon } from "@/components/Ikon";
import { LABEL_PERAN, RINGKASAN_PERAN } from "@/lib/peran";
import { supabaseTerhubung } from "@/lib/data/santri";
import {
  ambilProfilLogin,
  keluarDariSesi,
  type ProfilLogin,
} from "@/lib/sesi";

export default function HalamanAkun() {
  return (
    <PenjagaModul modul="akun">
      <IsiAkun />
    </PenjagaModul>
  );
}

function IsiAkun() {
  const modeContoh = !supabaseTerhubung();
  const router = useRouter();
  const [profil, setProfil] = useState<ProfilLogin | null>(null);
  const [memuat, setMemuat] = useState(!modeContoh);
  const [prosesKeluar, setProsesKeluar] = useState(false);

  useEffect(() => {
    if (modeContoh) return;
    let aktif = true;
    (async () => {
      const p = await ambilProfilLogin();
      if (!aktif) return;
      setProfil(p);
      setMemuat(false);
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh]);

  async function tanganiKeluar() {
    setProsesKeluar(true);
    await keluarDariSesi();
    router.replace("/login");
    router.refresh();
  }

  if (modeContoh) {
    return (
      <>
        <PenandaTahap />
        <h1 className="judul-halaman">Akun</h1>
        <p className="subjudul">Profil pengguna yang masuk.</p>
        <section className="kartu kartu-akun">
          <AvatarInisial nama="Pengguna Contoh" ukuran="besar" />
          <h2>Mode contoh</h2>
          <p>
            Aplikasi sedang berjalan tanpa login asli (env Supabase
            belum terisi), jadi belum ada profil yang bisa ditampilkan.
            Pada pemakaian asli, halaman ini berisi nama, peran, dan
            surel akun yang masuk beserta tombol keluar.
          </p>
          <Link href="/login" className="tombol">
            Ke halaman masuk
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <h1 className="judul-halaman">Akun</h1>
      <p className="subjudul">Profil pengguna yang masuk.</p>

      {memuat && <p className="catatan-kaki">Memuat profil…</p>}

      {!memuat && !profil && (
        <p className="pesan-galat" role="alert">
          Profil pengguna belum ditemukan di tabel profiles. Hubungi
          admin agar akun Anda didaftarkan profil dan perannya.
        </p>
      )}

      {!memuat && profil && (
        <>
          <section className="kartu kartu-akun">
            <AvatarInisial nama={profil.nama} ukuran="besar" />
            <h2>{profil.nama}</h2>
            <p className="akun-peran">{LABEL_PERAN[profil.peran]}</p>
            {profil.email && <p className="akun-email">{profil.email}</p>}
          </section>

          <section className="kartu">
            <h2>Hak akses Anda</h2>
            <p>{RINGKASAN_PERAN[profil.peran]}</p>
            <p className="catatan-kaki">
              Menu dan tombol yang tampil di aplikasi mengikuti hak
              akses ini; data yang bukan hak Anda tidak ditampilkan dan
              ditolak langsung oleh database.
            </p>
          </section>

          <button
            type="button"
            className="tombol tombol-penuh tombol-keluar"
            onClick={tanganiKeluar}
            disabled={prosesKeluar}
          >
            <Ikon nama="keluar" ukuran={19} />
            {prosesKeluar ? "Memproses…" : "Keluar"}
          </button>
        </>
      )}
    </>
  );
}
