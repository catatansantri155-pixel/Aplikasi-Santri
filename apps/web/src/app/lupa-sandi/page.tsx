"use client";

/**
 * Halaman Lupa Kata Sandi — minta tautan atur ulang lewat surel
 * (keputusan user 4 Nov 2026). Tanpa kerangka aplikasi.
 *
 * Pesan hasil SENGAJA generik: halaman ini tidak memberitahu apakah
 * suatu surel terdaftar atau tidak. Tautan dari surel menuju
 * /auth/callback?next=/atur-sandi (sesi pemulihan dibuat di sana),
 * lalu pengguna menetapkan sandi baru di /atur-sandi.
 */
import { useState, type FormEvent } from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import RangkaAuth from "@/components/RangkaAuth";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";

export default function HalamanLupaSandi() {
  const modeSupabase = supabaseTerhubung();
  const [email, setEmail] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState(false);
  const [mengirim, setMengirim] = useState(false);

  async function tanganiKirim(acara: FormEvent<HTMLFormElement>) {
    acara.preventDefault();
    setGalat(null);
    if (!modeSupabase) {
      setGalat(
        "Fitur ini belum aktif: env Supabase belum terisi, aplikasi sedang berjalan dalam mode contoh.",
      );
      return;
    }
    setMengirim(true);
    try {
      const supabase = buatKlienBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/atur-sandi`,
        },
      );
      if (error && /rate limit|too many/i.test(error.message)) {
        setGalat(
          "Terlalu banyak permintaan. Tunggu beberapa saat, lalu coba lagi.",
        );
        return;
      }
      // Galat lain (termasuk "surel tidak terdaftar" bila layanan
      // melaporkannya) TIDAK ditampilkan apa adanya — pesan generik
      // di bawah berlaku untuk semua keadaan terkirim.
      setTerkirim(true);
    } catch {
      setGalat("Gagal menghubungi layanan. Coba lagi beberapa saat lagi.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <RangkaAuth>
      <div className="auth-kolom">
        <h1 className="auth-judul">Lupa Kata Sandi</h1>
        <p className="auth-sub">
          Kami kirimkan tautan untuk mengatur ulang kata sandi Anda.
        </p>

        {!modeSupabase && (
          <PenandaTahap teks="MODE CONTOH · FITUR ASLI MENUNGGU ENV SUPABASE" />
        )}
        {terkirim ? (
          <>
            <p className="pesan-sukses" role="status">
              Bila surel tersebut terdaftar, tautan atur ulang kata
              sandi sudah kami kirimkan. Periksa kotak masuk (dan folder
              spam) Anda, lalu ikuti tautannya.
            </p>
            <p style={{ marginTop: 12 }}>
              <Link href="/login" className="tombol tombol-besar tombol-penuh">
                Kembali ke halaman masuk
              </Link>
            </p>
          </>
        ) : (
          <>
            <form className="formulir" onSubmit={tanganiKirim}>
              <label>
                Alamat surel akun
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {mengirim ? "Memproses…" : "Kirim tautan atur ulang"}
              </button>
            </form>
            <p className="catatan-kaki" style={{ textAlign: "center" }}>
              Ingat kata sandi? <Link href="/login">Masuk di sini</Link>
            </p>
          </>
        )}
      </div>
    </RangkaAuth>
  );
}
