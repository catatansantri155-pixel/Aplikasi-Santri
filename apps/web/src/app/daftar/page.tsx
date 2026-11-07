"use client";
import { Putaran } from "@/components/Muat";

/**
 * Halaman Daftar — SIGN UP KHUSUS WALI (keputusan user 4 Nov 2026).
 * Staf (pengajar hifzh/diniyyah, musyrif) TIDAK mendaftar di sini:
 * akun mereka dibuatkan admin (Panel Admin → tab Akun). Halaman ini
 * tanpa kerangka aplikasi (lihat Kerangka).
 *
 * Alur: supabase.auth.signUp dengan emailRedirectTo ke
 * /auth/callback?next=/login. Dua hasil ditangani:
 * (a) Sesi langsung ada (konfirmasi surel nonaktif): baris profiles
 *     (peran 'wali') disisipkan saat itu juga — diizinkan RLS oleh
 *     migrasi 0006 — lalu pesan sukses tampil di halaman ini.
 * (b) Tanpa sesi (konfirmasi surel aktif): nama disimpan sebagai
 *     penanda tertunda localStorage `santri.daftarWali`; profil
 *     dilengkapi otomatis oleh halaman login setelah masuk pertama
 *     (lib/sesi.ts: cobaLengkapiProfilWaliTertunda).
 * Akun wali yang belum ditautkan admin ke santri TIDAK melihat data
 * apa pun (RLS: wali hanya membaca santri tertaut di wali_santri).
 */
import { useState, type FormEvent } from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import KolomSandi from "@/components/KolomSandi";
import RangkaAuth from "@/components/RangkaAuth";
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import { KUNCI_DAFTAR_WALI_TERTUNDA } from "@/lib/sesi";

type Keadaan =
  | { jenis: "formulir" }
  | { jenis: "sukses-sesi" }
  | { jenis: "menunggu-konfirmasi" };

function pesanGalatDaftar(pesanMentah: string): string {
  if (/already registered|already exists/i.test(pesanMentah)) {
    return "Surel ini sudah terdaftar. Silakan masuk lewat halaman login, atau gunakan lupa kata sandi bila lupa sandinya.";
  }
  if (/password.*(short|least|weak)/i.test(pesanMentah)) {
    return "Kata sandi terlalu pendek atau terlalu lemah. Gunakan minimal 6 karakter dengan campuran huruf dan angka.";
  }
  if (/invalid.*email|email.*invalid/i.test(pesanMentah)) {
    return "Alamat surel tidak valid. Periksa kembali penulisannya.";
  }
  if (/rate limit|too many/i.test(pesanMentah)) {
    return "Terlalu banyak percobaan. Tunggu beberapa saat, lalu coba lagi.";
  }
  return "Pendaftaran gagal. Periksa koneksi internet, lalu coba lagi.";
}

export default function HalamanDaftar() {
  const modeSupabase = supabaseTerhubung();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [keadaan, setKeadaan] = useState<Keadaan>({ jenis: "formulir" });

  async function tanganiKirim(acara: FormEvent<HTMLFormElement>) {
    acara.preventDefault();
    setGalat(null);
    if (!modeSupabase) {
      setGalat(
        "Pendaftaran asli belum aktif: env Supabase belum terisi, aplikasi sedang berjalan dalam mode contoh.",
      );
      return;
    }
    if (nama.trim().length === 0) {
      setGalat("Nama wali wajib diisi.");
      return;
    }
    if (kataSandi.length < 6) {
      setGalat("Kata sandi minimal 6 karakter.");
      return;
    }
    if (kataSandi !== konfirmasi) {
      setGalat("Konfirmasi kata sandi tidak sama. Periksa kembali.");
      return;
    }
    setMengirim(true);
    try {
      const supabase = buatKlienBrowser();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: kataSandi,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/login`,
          data: { nama: nama.trim() },
        },
      });
      if (error) {
        setGalat(pesanGalatDaftar(error.message));
        return;
      }
      if (data.session && data.user) {
        // Jalur (a): sesi langsung aktif → buat profil wali sekarang.
        const { error: galatProfil } = await supabase
          .from("profiles")
          .insert({ id: data.user.id, peran: "wali", nama: nama.trim() });
        if (galatProfil) {
          setGalat(
            "Akun terdaftar, tetapi profil wali belum dapat dibuat. Silakan masuk lewat halaman login; bila akses belum tampil, hubungi admin.",
          );
          return;
        }
        setKeadaan({ jenis: "sukses-sesi" });
        return;
      }
      // Jalur (b): menunggu konfirmasi surel → simpan nama tertunda.
      try {
        localStorage.setItem(
          KUNCI_DAFTAR_WALI_TERTUNDA,
          JSON.stringify({ nama: nama.trim(), email: email.trim() }),
        );
      } catch {
        // Storage tidak tersedia: profil dilengkapi admin secara
        // manual; pesan di layar tetap menjelaskan langkahnya.
      }
      setKeadaan({ jenis: "menunggu-konfirmasi" });
    } catch {
      setGalat(
        "Gagal menghubungi layanan pendaftaran. Coba lagi beberapa saat lagi.",
      );
    } finally {
      setMengirim(false);
    }
  }

  return (
    <RangkaAuth
      varian="daftar"
      langkah={[
        "Isi data wali dan buat kata sandi",
        "Masuk dengan akun yang baru dibuat",
        "Admin menautkan akun Anda ke santri",
      ]}
    >
      <div className="auth-kolom">
        <h1 className="auth-judul">Buat akun wali</h1>
        <p className="auth-sub">
          Daftar untuk mengikuti perkembangan anak Anda. Akun pengajar dan
          musyrif disiapkan oleh admin.
        </p>

        {!modeSupabase && (
          <PenandaTahap teks="Mode contoh · Layanan pendaftaran belum diaktifkan." />
        )}

        {keadaan.jenis === "sukses-sesi" && (
          <>
            <p className="pesan-sukses" role="status">
              Pendaftaran berhasil. Akun Anda sudah aktif sebagai wali.
            </p>
            <p style={{ marginTop: 12 }}>
              Data anak Anda akan tampil setelah admin menautkan akun ini ke
              santri. Hubungi admin pondok untuk proses penautan.
            </p>
            <Link href="/" className="tombol tombol-besar tombol-penuh">
              Masuk ke beranda
            </Link>
          </>
        )}

        {keadaan.jenis === "menunggu-konfirmasi" && (
          <>
            <p className="pesan-sukses" role="status">
              Pendaftaran diterima. Periksa kotak masuk surel Anda untuk
              mengonfirmasi akun.
            </p>
            <p style={{ marginTop: 12 }}>
              Setelah mengonfirmasi dan masuk pertama kali, profil wali Anda
              dilengkapi otomatis. Data anak tampil setelah admin menautkan akun
              Anda ke santri.
            </p>
            <Link href="/login" className="tombol tombol-besar tombol-penuh">
              Ke halaman masuk
            </Link>
          </>
        )}

        {keadaan.jenis === "formulir" && (
          <>
            <p className="akses-catatan">
              Ikuti konfirmasi email bila diminta. Data anak akan tampil setelah
              admin menautkan akun ini ke santri.
            </p>
            <form className="formulir" onSubmit={tanganiKirim}>
              <label>
                Nama wali
                <input
                  type="text"
                  name="nama"
                  autoComplete="name"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap orang tua / wali"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <KolomSandi
                label="Kata sandi"
                nama="kata-sandi"
                autoComplete="new-password"
                nilai={kataSandi}
                onUbah={setKataSandi}
              />
              <KolomSandi
                label="Konfirmasi kata sandi"
                nama="konfirmasi-kata-sandi"
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
                {mengirim && <Putaran />} {mengirim ? "Memproses…" : "Buat akun wali"}
              </button>
            </form>
            <p className="catatan-kaki" style={{ textAlign: "center" }}>
              Sudah punya akun? <Link href="/login">Masuk di sini</Link>
            </p>
          </>
        )}
      </div>
    </RangkaAuth>
  );
}
