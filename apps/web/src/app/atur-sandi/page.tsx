"use client";

/**
 * Halaman Atur Kata Sandi Baru — tujuan akhir alur lupa sandi
 * (keputusan user 4 Nov 2026). Tanpa kerangka aplikasi.
 *
 * Pengguna tiba di sini lewat tautan surel → /auth/callback menukar
 * kode menjadi SESI PEMULIHAN lalu mengalihkan ke halaman ini. Bila
 * sesi itu tidak ada (tautan dibuka langsung, tidak valid, atau
 * kedaluwarsa), yang tampil pesan penjelasan + tautan meminta
 * tautan baru di /lupa-sandi — formulir tidak ditampilkan.
 *
 * Sandi baru disimpan lewat supabase.auth.updateUser; sesi pemulihan
 * adalah sesi masuk biasa, jadi setelah berhasil pengguna dapat
 * langsung lanjut ke beranda.
 */
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import KolomSandi from "@/components/KolomSandi";
import { Ikon } from "@/components/Ikon";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import { adaSesiAktif } from "@/lib/sesi";

type Keadaan = "memeriksa" | "tanpa-sesi" | "formulir" | "sukses";

export default function HalamanAturSandi() {
  const modeSupabase = supabaseTerhubung();
  const [keadaan, setKeadaan] = useState<Keadaan>(
    modeSupabase ? "memeriksa" : "tanpa-sesi",
  );
  const [kataSandi, setKataSandi] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    if (!modeSupabase) return;
    let aktif = true;
    (async () => {
      const ada = await adaSesiAktif();
      if (aktif) setKeadaan(ada ? "formulir" : "tanpa-sesi");
    })();
    return () => {
      aktif = false;
    };
  }, [modeSupabase]);

  async function tanganiKirim(acara: FormEvent<HTMLFormElement>) {
    acara.preventDefault();
    setGalat(null);
    if (kataSandi.length < 6) {
      setGalat("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (kataSandi !== konfirmasi) {
      setGalat("Konfirmasi kata sandi tidak sama. Periksa kembali.");
      return;
    }
    setMengirim(true);
    try {
      const supabase = buatKlienBrowser();
      const { error } = await supabase.auth.updateUser({
        password: kataSandi,
      });
      if (error) {
        if (/different from the old|same as/i.test(error.message)) {
          setGalat("Kata sandi baru harus berbeda dari kata sandi lama.");
        } else if (/session|auth/i.test(error.message)) {
          setKeadaan("tanpa-sesi");
        } else {
          setGalat(
            "Gagal menyimpan kata sandi baru. Coba lagi beberapa saat lagi.",
          );
        }
        return;
      }
      setKeadaan("sukses");
    } catch {
      setGalat("Gagal menghubungi layanan. Coba lagi beberapa saat lagi.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="auth-bungkus">
      <Link href="/login" className="auth-kembali">
        <Ikon nama="panah-kiri" ukuran={16} />
        Kembali masuk
      </Link>
      <h1 className="auth-judul">Atur Kata Sandi Baru</h1>
      <p className="auth-sub">
        Tetapkan kata sandi baru untuk akun Anda.
      </p>

      <div className="auth-isi">
        {!modeSupabase && (
          <PenandaTahap teks="MODE CONTOH · FITUR ASLI MENUNGGU ENV SUPABASE" />
        )}

        {keadaan === "memeriksa" && (
          <p className="catatan-kaki">Memeriksa tautan Anda…</p>
        )}

        {keadaan === "tanpa-sesi" && (
          <>
            <p className="pesan-galat" role="alert">
              Tautan atur ulang tidak valid atau sudah kedaluwarsa.
              Minta tautan baru, lalu buka tautan terbaru dari surel
              Anda.
            </p>
            <p style={{ marginTop: 12 }}>
              <Link
                href="/lupa-sandi"
                className="tombol tombol-besar tombol-penuh"
              >
                Minta tautan baru
              </Link>
            </p>
          </>
        )}

        {keadaan === "formulir" && (
          <form className="formulir" onSubmit={tanganiKirim}>
            <KolomSandi
              label="Kata sandi baru"
              nama="kata-sandi-baru"
              autoComplete="new-password"
              nilai={kataSandi}
              onUbah={setKataSandi}
            />
            <KolomSandi
              label="Konfirmasi kata sandi baru"
              nama="konfirmasi-kata-sandi-baru"
              autoComplete="new-password"
              nilai={konfirmasi}
              onUbah={setKonfirmasi}
            />
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
              {mengirim ? "Memproses…" : "Simpan kata sandi baru"}
            </button>
          </form>
        )}

        {keadaan === "sukses" && (
          <>
            <p className="pesan-sukses" role="status">
              Kata sandi baru tersimpan. Gunakan kata sandi ini untuk
              masuk berikutnya.
            </p>
            <p style={{ marginTop: 12 }}>
              <Link href="/" className="tombol tombol-besar tombol-penuh">
                Masuk ke beranda
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
