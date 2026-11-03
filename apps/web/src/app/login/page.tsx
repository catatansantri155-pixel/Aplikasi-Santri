"use client";

/**
 * Halaman masuk — LOGIN ASLI Supabase Auth (Tahap 3).
 *
 * Formulir mengirim surel + kata sandi lewat klien Supabase browser
 * (signInWithPassword). Sukses → diarahkan ke beranda; gagal → pesan
 * galat bahasa Indonesia. Peran pengguna TIDAK dipilih di sini —
 * ditentukan dari baris tabel profiles milik akun yang masuk.
 *
 * MODE CONTOH (env Supabase kosong): formulir tetap tampil, tetapi
 * pengiriman ditolak dengan penjelasan bahwa login asli belum aktif.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PenandaTahap from "@/components/PenandaTahap";
import { Ikon } from "@/components/Ikon";
import { ILUSTRASI_LOGIN } from "@/lib/ilustrasi-login";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";

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

export default function HalamanLogin() {
  const router = useRouter();
  const modeSupabase = supabaseTerhubung();
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  async function tanganiKirim(acara: FormEvent<HTMLFormElement>) {
    acara.preventDefault();
    setGalat(null);
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
      // Sesi tersimpan oleh klien Supabase (cookie); penjaga halaman di
      // kerangka akan membaca profilnya di beranda.
      router.replace("/");
      router.refresh();
    } catch {
      setGalat("Gagal menghubungi layanan masuk. Coba lagi beberapa saat lagi.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="login-bungkus">
      {/* Hero (arah UI UNPIX): pita gradien hijau kop berisi logo,
          judul, sapaan, dan ilustrasi santri mengaji; formulir masuk
          berada di lembar putih melengkung yang menimpa hero. */}
      <div className="login-hero">
        <span className="logo-login logo-login--hero">
          <Ikon nama="hifzh" ukuran={38} />
        </span>
        <h1 className="login-judul">Aplikasi Santri</h1>
        <p className="login-sapaan">
          Assalamu&rsquo;alaikum, selamat datang
        </p>
        <p className="login-sub">
          Ponpes Minhajus Sunnah Magelang · Marhalah Wustha
        </p>
        {/* Ilustrasi datar dua santri mengaji (data URI WebP, palet kop). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="login-ilustrasi"
          src={ILUSTRASI_LOGIN}
          alt="Ilustrasi dua santri sedang mengaji bersama"
          width={1200}
          height={670}
        />
      </div>

      <div className="login-lembar">
        {!modeSupabase && (
          <PenandaTahap teks="MODE CONTOH · LOGIN ASLI MENUNGGU ENV SUPABASE" />
        )}
        <form className="formulir" onSubmit={tanganiKirim}>
          <label>
            Alamat surel
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Kata sandi
            <input
              type="password"
              name="kata-sandi"
              autoComplete="current-password"
              required
              value={kataSandi}
              onChange={(e) => setKataSandi(e.target.value)}
            />
          </label>
          {galat && (
            <p className="pesan-galat" role="alert">
              {galat}
            </p>
          )}
          <button
            type="submit"
            className="tombol tombol-besar tombol-penuh"
            disabled={mengirim}
          >
            {mengirim ? "Memproses…" : "Masuk"}
          </button>
        </form>

        <p className="catatan-kaki" style={{ textAlign: "center" }}>
          Peran pengguna (admin, pengajar hifzh, pengajar diniyyah,
          musyrif, orang tua) ditentukan dari akun yang terdaftar,
          bukan dipilih di formulir ini.
        </p>
      </div>
    </div>
  );
}
