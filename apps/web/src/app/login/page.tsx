"use client";

/**
 * Halaman masuk — LOGIN ASLI Supabase Auth (Tahap 3).
 *
 * Formulir mengirim surel + kata sandi lewat klien Supabase browser
 * (signInWithPassword). Sukses → diarahkan ke beranda; gagal → pesan
 * galat bahasa Indonesia. Peran pengguna TIDAK dipilih di sini —
 * ditentukan dari baris tabel profiles milik akun yang masuk.
 *
 * Perbaikan audit Fase 1 (3 Nov 2026):
 * - Halaman ini TIDAK dibungkus kerangka aplikasi (lihat Kerangka):
 *   tidak ada sidebar/header/navigasi bawah di sini.
 * - Tombol tampilkan/sembunyikan kata sandi (ikon mata).
 * - Kalimat bantuan singkat: "Pengguna dan kata sandi memakai akun
 *   yang diberikan oleh tim kepesantrenan."
 * - Keadaan khusus "masuk tetapi profil belum disiapkan": sesi Auth
 *   berhasil tetapi baris profiles belum ada → pesan khusus tampil
 *   di halaman ini ("Akun berhasil masuk, tetapi akses belum
 *   disiapkan. Hubungi admin."), pengguna tidak dipantulkan diam-
 *   diam antara beranda dan login. Terdeteksi tiga jalan: tepat
 *   setelah kirim formulir, saat halaman dibuka dengan sesi yatim,
 *   dan lewat penanda sessionStorage dari penjaga kerangka.
 *
 * MODE CONTOH (env Supabase kosong): formulir tetap tampil, tetapi
 * pengiriman ditolak dengan penjelasan bahwa login asli belum aktif.
 *
 * Perluasan 4 Nov 2026 (keputusan user):
 * - Gerbang SAMBUTAN: pengunjung tanpa sesi yang belum menuntaskan
 *   halaman sambutan di perangkat ini (penanda localStorage
 *   `santri.sambutan.selesai`, lib/sesi.ts) dialihkan ke /sambutan.
 * - Profil wali tertunda: wali yang mendaftar lewat /daftar dan baru
 *   mengonfirmasi surel bisa masuk tanpa baris profiles — sebelum
 *   menyatakan "profil belum disiapkan", halaman ini mencoba
 *   melengkapi profil dari penanda pendaftaran (peran selalu 'wali').
 * - Tautan: "Lupa kata sandi?" (/lupa-sandi), "Daftar" khusus wali
 *   (/daftar), dan "Lihat perkenalan" (/sambutan).
 *
 * Redesain simpel (arahan user 4 Nov 2026, menggantikan tampilan
 * maket berhero besar pagi harinya): logo & teks merek besar
 * DIHAPUS; di HP halaman tampil polos seperti aplikasi profesional
 * (judul "Masuk" ringkas, kolom berlabel ikon, tombol pil selebar
 * kolom). Di PC (≥1024px) tampil gaya panel belah seperti image 4
 * dari user: panel gradien berisi ilustrasi + tiga langkah di kiri,
 * formulir di kanan. Baris nama pondok dipertahankan sebagai sub
 * kecil (ketok user 3 Nov 2026). Logika masuk tidak berubah.
 */
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PenandaTahap from "@/components/PenandaTahap";
import { Ikon } from "@/components/Ikon";
import { ILUSTRASI_LOGIN } from "@/lib/ilustrasi-login";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import {
  KUNCI_PENANDA_PROFIL_BELUM_DISIAPKAN,
  adaSesiAktif,
  ambilProfilLogin,
  cobaLengkapiProfilWaliTertunda,
  sambutanSudahSelesai,
} from "@/lib/sesi";

/** Ubah pesan galat Supabase menjadi pesan Indonesia yang jelas. */
function pesanGalatLogin(pesanMentah: string): string {
  if (/invalid login credentials/i.test(pesanMentah)) {
    return "Surel atau kata sandi salah. Periksa kembali, lalu coba lagi.";
  }
  if (/email not confirmed/i.test(pesanMentah)) {
    return "Akun belum terkonfirmasi. Hubungi admin untuk mengaktifkan akun ini.";
  }
  if (/rate limit|too many/i.test(pesanMentah)) {
    return "Terlalu banyak percobaan masuk. Tunggu beberapa saat, lalu coba lagi.";
  }
  return "Gagal masuk. Periksa koneksi internet, lalu coba lagi.";
}

const PESAN_PROFIL_BELUM_DISIAPKAN =
  "Akun berhasil masuk, tetapi akses belum disiapkan. Hubungi admin.";

export default function HalamanLogin() {
  const router = useRouter();
  const modeSupabase = supabaseTerhubung();
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [sandiTerlihat, setSandiTerlihat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [profilBelumDisiapkan, setProfilBelumDisiapkan] = useState(false);
  const [mengirim, setMengirim] = useState(false);

  /* Saat halaman dibuka: bila sudah ada sesi dengan profil → teruskan
     ke beranda; bila sesi ada tetapi profil belum disiapkan (termasuk
     pantulan dari penjaga kerangka yang menyetel penanda) → tampilkan
     pesan khusus di sini; bila TIDAK ada sesi dan sambutan belum
     dituntaskan di perangkat ini → alihkan ke /sambutan. Sebelum
     menyatakan profil belum disiapkan, coba lengkapi profil wali
     dari penanda pendaftaran tertunda (jalur konfirmasi surel). */
  useEffect(() => {
    if (!modeSupabase) return;
    let aktif = true;
    (async () => {
      // Pesan dari callback auth (tautan surel tidak valid).
      try {
        if (
          new URLSearchParams(window.location.search).get("auth") ===
          "tautan-tidak-valid"
        ) {
          setGalat(
            "Tautan dari surel tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman lupa kata sandi.",
          );
        }
      } catch {
        // Abaikan — parameter URL bukan jalur kritis.
      }
      let dariPenanda = false;
      try {
        dariPenanda =
          sessionStorage.getItem(KUNCI_PENANDA_PROFIL_BELUM_DISIAPKAN) ===
          "1";
        if (dariPenanda) {
          sessionStorage.removeItem(KUNCI_PENANDA_PROFIL_BELUM_DISIAPKAN);
        }
      } catch {
        // sessionStorage tidak tersedia — lanjut dengan cek sesi.
      }
      const profil = await ambilProfilLogin();
      if (!aktif) return;
      if (profil) {
        router.replace("/");
        return;
      }
      if (dariPenanda) {
        if (aktif) setProfilBelumDisiapkan(true);
        return;
      }
      if (await adaSesiAktif()) {
        if (!aktif) return;
        const dilengkapi = await cobaLengkapiProfilWaliTertunda();
        if (!aktif) return;
        if (dilengkapi) {
          const profilBaru = await ambilProfilLogin();
          if (!aktif) return;
          if (profilBaru) {
            router.replace("/");
            return;
          }
        }
        if (aktif) setProfilBelumDisiapkan(true);
        return;
      }
      // Tanpa sesi sama sekali: gerbang sambutan sekali per perangkat.
      if (!sambutanSudahSelesai()) {
        router.replace("/sambutan");
      }
    })();
    return () => {
      aktif = false;
    };
  }, [modeSupabase, router]);

  async function tanganiKirim(acara: FormEvent<HTMLFormElement>) {
    acara.preventDefault();
    setGalat(null);
    setProfilBelumDisiapkan(false);
    if (!modeSupabase) {
      setGalat(
        "Login asli belum aktif: env Supabase belum terisi, aplikasi sedang berjalan dalam mode contoh.",
      );
      return;
    }
    setMengirim(true);
    try {
      const supabase = buatKlienBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: kataSandi,
      });
      if (error) {
        setGalat(pesanGalatLogin(error.message));
        return;
      }
      // Sesi Auth berhasil. Pastikan baris profilnya sudah disiapkan
      // admin SEBELUM meneruskan ke beranda — bila belum, tampilkan
      // pesan khusus di sini (audit Fase 1), jangan memantulkan
      // pengguna tanpa penjelasan. Wali yang baru mendaftar dapat
      // dilengkapi profilnya dari penanda pendaftaran tertunda
      // (peran selalu 'wali'; staf tetap menunggu dibuatkan admin).
      let profil = await ambilProfilLogin();
      if (!profil) {
        const dilengkapi = await cobaLengkapiProfilWaliTertunda();
        if (dilengkapi) {
          profil = await ambilProfilLogin();
        }
      }
      if (!profil) {
        setProfilBelumDisiapkan(true);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setGalat("Gagal menghubungi layanan masuk. Coba lagi beberapa saat lagi.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="login-split">
      {/* Panel kiri KHUSUS PC (gaya image 4 dari user, 4 Nov 2026):
          gradien biru + ilustrasi tumpukan buku + tiga langkah
          singkat di dalam kartu membulat besar. Di HP panel ini
          tidak tampil sama sekali — halaman masuk tampil polos dan
          simpel tanpa logo & teks merek besar (arahan user 4 Nov:
          "hapus aja logo dan tulisannya, dibuat simpel aja"). */}
      <aside className="login-panel" aria-hidden="true">
        {/* Ilustrasi tumpukan buku dan lentera (data URI WebP). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="login-panel-ilustrasi"
          src={ILUSTRASI_LOGIN}
          alt=""
          width={1200}
          height={670}
        />
        <p className="login-panel-judul">
          Pantau hafalan, nilai, dan keseharian santri dalam satu
          aplikasi.
        </p>
        <ol className="login-langkah">
          <li>
            <span>1</span>
            Masuk dengan akun dari tim kepesantrenan
          </li>
          <li>
            <span>2</span>
            Setoran, nilai &amp; kehadiran tercatat rapi
          </li>
          <li>
            <span>3</span>
            Wali hanya melihat data anaknya sendiri
          </li>
        </ol>
      </aside>

      <div className="login-isi">
        <h1 className="auth-judul">Masuk</h1>
        <p className="auth-sub">
          Assalamu&rsquo;alaikum, selamat datang kembali.
          <span className="auth-sub-kecil">
            Ponpes Minhajus Sunnah Magelang · Marhalah Wustha
          </span>
        </p>
        {!modeSupabase && (
          <PenandaTahap teks="MODE CONTOH · LOGIN ASLI MENUNGGU ENV SUPABASE" />
        )}
        {profilBelumDisiapkan && (
          <p className="pesan-galat" role="alert" style={{ marginBottom: 14 }}>
            {PESAN_PROFIL_BELUM_DISIAPKAN}
          </p>
        )}
        <form className="formulir" onSubmit={tanganiKirim}>
          <label>
            <span className="label-ikon">
              <Ikon nama="akun" ukuran={16} />
              Alamat surel
            </span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="Masukkan alamat surel"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            <span className="label-ikon">
              <Ikon nama="gembok" ukuran={16} />
              Kata sandi
            </span>
            <span className="bungkus-sandi">
              <input
                type={sandiTerlihat ? "text" : "password"}
                name="kata-sandi"
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                required
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
              />
              <button
                type="button"
                className="tombol-mata"
                aria-label={
                  sandiTerlihat
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
                }
                aria-pressed={sandiTerlihat}
                onClick={() => setSandiTerlihat((lama) => !lama)}
              >
                <Ikon nama={sandiTerlihat ? "mata-silang" : "mata"} ukuran={22} />
              </button>
            </span>
          </label>
          {galat && (
            <p className="pesan-galat" role="alert">
              {galat}
            </p>
          )}
          <button
            type="submit"
            className="tombol tombol-besar tombol-penuh tombol-pil"
            disabled={mengirim}
          >
            {mengirim ? (
              "Memproses…"
            ) : (
              <>
                <Ikon nama="masuk" ukuran={20} />
                Masuk
              </>
            )}
          </button>
        </form>

        <p className="catatan-kaki" style={{ textAlign: "center" }}>
          Pengguna dan kata sandi memakai akun yang diberikan oleh tim
          kepesantrenan. <Link href="/lupa-sandi">Lupa kata sandi?</Link>
          {" · "}
          <Link href="/sambutan">Lihat perkenalan</Link>
        </p>
        <hr className="login-pemisah" />
        <p className="catatan-kaki" style={{ textAlign: "center" }}>
          Wali santri belum mempunyai akun?{" "}
          <Link href="/daftar">Daftar di sini</Link> untuk mendapatkan
          akses.
        </p>
      </div>
    </div>
  );
}
