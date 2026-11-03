"use client";

/**
 * Info pengguna pada kerangka (sidebar & kepala) + PENJAGA HALAMAN.
 *
 * MODE CONTOH (env Supabase kosong): tampil persis seperti sebelumnya —
 * tautan "Masuk" ke /login, tanpa penjagaan apa pun, agar perilaku
 * berbasis data contoh tidak berubah.
 *
 * MODE SUPABASE:
 * - Menampilkan nama + label peran pengguna yang login (dari tabel
 *   profiles lewat lib/sesi.ts) dan tombol Keluar (signOut → /login).
 * - Penjaga halaman sisi klien: halaman selain /login yang dibuka
 *   tanpa sesi aktif diarahkan ke /login; sebaliknya, /login yang
 *   dibuka dengan sesi aktif diarahkan ke beranda. Data sendiri sudah
 *   dijaga RLS di database — penjaga ini murni pengalaman pengguna.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import { LABEL_PERAN } from "@/lib/peran";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import { Ikon } from "@/components/Ikon";
import AvatarInisial from "@/components/AvatarInisial";

function TautanMasuk({ varian }: { varian: "samping" | "kepala" }) {
  if (varian === "kepala") {
    return (
      <Link href="/login" className="tombol tombol-kecil">
        Masuk
      </Link>
    );
  }
  return (
    <Link href="/login" className="nav-tautan nav-masuk">
      <span className="nav-ikon" aria-hidden="true">
        <Ikon nama="masuk" ukuran={20} />
      </span>
      <span>Masuk</span>
    </Link>
  );
}

export default function InfoPengguna({
  varian,
}: {
  varian: "samping" | "kepala";
}) {
  const modeSupabase = supabaseTerhubung();
  const pathname = usePathname();
  const router = useRouter();
  const [profil, setProfil] = useState<ProfilLogin | null>(null);
  const [cekSelesai, setCekSelesai] = useState(false);
  const [prosesKeluar, setProsesKeluar] = useState(false);

  useEffect(() => {
    if (!modeSupabase) return;
    let aktif = true;
    (async () => {
      const p = await ambilProfilLogin();
      if (!aktif) return;
      setProfil(p);
      setCekSelesai(true);
      if (!p && pathname !== "/login") {
        // Tanpa sesi (atau profil belum terdaftar): ke halaman masuk.
        router.replace("/login");
      } else if (p && pathname === "/login") {
        // Sudah masuk tetapi membuka /login: teruskan ke beranda.
        router.replace("/");
      }
    })();
    return () => {
      aktif = false;
    };
  }, [modeSupabase, pathname, router]);

  async function tanganiKeluar() {
    setProsesKeluar(true);
    try {
      await buatKlienBrowser().auth.signOut();
    } catch {
      // Sesi di sisi tampilan tetap dianggap selesai; pengguna diarahkan
      // ke /login dan penjaga akan memeriksa ulang sesi di sana.
    }
    setProfil(null);
    router.replace("/login");
    router.refresh();
  }

  // Mode contoh: perilaku lama persis (tautan Masuk).
  if (!modeSupabase) return <TautanMasuk varian={varian} />;
  // Mode Supabase: tunggu hasil cek sesi agar tidak berkedip.
  if (!cekSelesai) return null;
  if (!profil) return <TautanMasuk varian={varian} />;

  if (varian === "kepala") {
    return (
      <div className="info-pengguna-kepala">
        <AvatarInisial nama={profil.nama} ukuran="kecil" />
        <span className="info-pengguna-teks">
          <span className="info-pengguna-nama">{profil.nama}</span>
          <span className="info-pengguna-peran">
            {LABEL_PERAN[profil.peran]}
          </span>
        </span>
        <button
          type="button"
          className="tombol-ikon"
          onClick={tanganiKeluar}
          disabled={prosesKeluar}
          aria-label="Keluar"
          title="Keluar"
        >
          <Ikon nama="keluar" ukuran={19} />
        </button>
      </div>
    );
  }

  // Sidebar (desktop): ringkasan profil menjadi tautan ke halaman
  // Akun — profil lengkap, penjelasan hak akses, dan tombol Keluar
  // kini terpusat di /akun agar kerangka ringkas.
  return (
    <Link
      href="/akun"
      className="info-pengguna-samping nav-masuk"
      aria-current={pathname === "/akun" ? "page" : undefined}
    >
      <span className="info-pengguna-baris">
        <AvatarInisial nama={profil.nama} ukuran="kecil" />
        <span>
          <span className="info-pengguna-nama">{profil.nama}</span>
          <span className="info-pengguna-peran">
            {LABEL_PERAN[profil.peran]}
          </span>
        </span>
        <span className="info-pengguna-chevron" aria-hidden="true">
          <Ikon nama="chevron-kanan" ukuran={16} />
        </span>
      </span>
    </Link>
  );
}
