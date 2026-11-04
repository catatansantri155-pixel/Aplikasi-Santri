"use client";

/**
 * Info pengguna pada kerangka (sidebar & kepala) + PENJAGA HALAMAN.
 *
 * MODE CONTOH (env Supabase kosong): tampil persis seperti sebelumnya —
 * tautan "Masuk" ke /login, tanpa penjagaan apa pun, agar perilaku
 * berbasis data contoh tidak berubah.
 *
 * MODE SUPABASE:
 * - Menampilkan IDENTITAS pengguna yang login (avatar inisial + nama
 *   + label peran, dari tabel profiles lewat lib/sesi.ts) sebagai
 *   blok paling atas kepala & sidebar, menggantikan teks merek
 *   aplikasi (revisi biru 3 Nov 2026). Blok ini menaut ke /akun;
 *   tombol Keluar HANYA ada di halaman Akun — tidak ada tombol
 *   keluar di kerangka.
 * - Penjaga halaman sisi klien: halaman selain /login yang dibuka
 *   tanpa sesi aktif diarahkan ke /login; sebaliknya, /login yang
 *   dibuka dengan sesi aktif diarahkan ke beranda. Data sendiri sudah
 *   dijaga RLS di database — penjaga ini murni pengalaman pengguna.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseTerhubung } from "@/lib/data/santri";
import { LABEL_PERAN } from "@/lib/peran";
import {
  KUNCI_PENANDA_PROFIL_BELUM_DISIAPKAN,
  adaSesiAktif,
  ambilProfilLogin,
  type ProfilLogin,
} from "@/lib/sesi";
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
    <Link href="/login" className="nav-tautan">
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

  useEffect(() => {
    if (!modeSupabase) return;
    let aktif = true;
    (async () => {
      const p = await ambilProfilLogin();
      if (!aktif) return;
      setProfil(p);
      setCekSelesai(true);
      if (!p && pathname !== "/login") {
        // Ke halaman masuk. Bedakan sebabnya (audit Fase 1): sesi
        // Auth ADA tetapi baris profilnya belum disiapkan → setel
        // penanda agar /login menampilkan pesan khusus "akses belum
        // disiapkan, hubungi admin", bukan pantulan diam tanpa
        // penjelasan. Tanpa sesi sama sekali: masuk biasa.
        if (await adaSesiAktif()) {
          try {
            sessionStorage.setItem(KUNCI_PENANDA_PROFIL_BELUM_DISIAPKAN, "1");
          } catch {
            // sessionStorage tidak tersedia — pesan khusus dilewati.
          }
        }
        if (!aktif) return;
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

  // Mode contoh: perilaku lama persis (tautan Masuk).
  if (!modeSupabase) return <TautanMasuk varian={varian} />;
  // Mode Supabase: tunggu hasil cek sesi agar tidak berkedip.
  if (!cekSelesai) return null;
  if (!profil) return <TautanMasuk varian={varian} />;

  if (varian === "kepala") {
    // Kepala HP: identitas pengguna (avatar + nama tebal + peran
    // kecil) sebagai tautan ke /akun — tanpa tombol keluar.
    return (
      <Link
        href="/akun"
        className="info-pengguna-kepala"
        aria-current={pathname === "/akun" ? "page" : undefined}
      >
        <AvatarInisial nama={profil.nama} ukuran="kecil" />
        <span className="info-pengguna-teks">
          <span className="info-pengguna-nama">{profil.nama}</span>
          <span className="info-pengguna-peran">
            {LABEL_PERAN[profil.peran]}
          </span>
        </span>
      </Link>
    );
  }

  // Identitas di dasar sidebar; nama panjang membungkus tanpa
  // menggeser ikon dan avatar. Tautan membuka pengaturan akun.
  return (
    <Link
      href="/akun"
      className="info-pengguna-samping"
      aria-current={pathname === "/akun" ? "page" : undefined}
    >
      <AvatarInisial nama={profil.nama} ukuran="kecil" />
      <span className="profil-sidebar-teks">
        <span className="info-pengguna-nama">{profil.nama}</span>
        <span className="info-pengguna-peran">{LABEL_PERAN[profil.peran]}</span>
      </span>
      <Ikon nama="chevron-kanan" ukuran={16} />
    </Link>
  );
}
