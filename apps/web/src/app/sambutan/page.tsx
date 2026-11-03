"use client";

/**
 * Halaman Sambutan — onboarding TERPISAH di depan halaman login
 * (keputusan user 4 Nov 2026): 1 layar sambutan + 4 slide fitur,
 * slide terakhir menuju /login. Berlaku mobile & PC (PC dua kolom:
 * visual kiri, teks + kendali kanan). Tanpa kerangka aplikasi
 * (lihat PATH_TANPA_KERANGKA di komponen Kerangka).
 *
 * Selesai / Lewati / Masuk → penanda localStorage
 * `santri.sambutan.selesai` = "1" (lib/sesi.ts) lalu ke /login;
 * gerbangnya ada di halaman login (pengunjung tanpa sesi yang belum
 * punya penanda dialihkan ke sini). Halaman ini sendiri selalu bisa
 * dibuka langsung, juga setelah penanda ada (tautan "Lihat
 * perkenalan" di halaman login menunjuk ke sini).
 */
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import IkonModul from "@/components/IkonModul";
import { ILUSTRASI_LOGIN } from "@/lib/ilustrasi-login";
import { KUNCI_SAMBUTAN_SELESAI } from "@/lib/sesi";

interface Slide {
  judul: string;
  teks: string;
  visual: ReactNode;
}

const SLIDE: Slide[] = [
  {
    judul: "Selamat datang di Aplikasi Santri",
    teks: "Aplikasi monitoring santri Ponpes Minhajus Sunnah Magelang · Marhalah Wustha. Hafalan, nilai, kehadiran, dan keseharian santri terpantau dalam satu tempat.",
    visual: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="sambutan-ilustrasi"
        src={ILUSTRASI_LOGIN}
        alt="Ilustrasi dua santri sedang mengaji bersama"
        width={1200}
        height={670}
      />
    ),
  },
  {
    judul: "Hafalan tercatat rapi",
    teks: "Setoran harian Buku Hafalan (BC, BR, TS, LM) dan tes semester per juz tercatat dengan nilai otomatis, lengkap dengan grafik progres pekanan dan bulanan.",
    visual: <IkonModul modul="hifzh" ikon="hifzh" warna="biru" />,
  },
  {
    judul: "Diniyyah & kehadiran jelas",
    teks: "Nilai harian dan nilai ujian semester diniyyah tercatat per mata pelajaran. Kehadiran setiap sesi hifzh maupun diniyyah terisi Hadir, Sakit, Izin, atau Alpa.",
    visual: (
      <>
        <IkonModul modul="diniyyah" ikon="diniyyah" warna="hijau" />
        <IkonModul modul="kehadiran" ikon="kehadiran" warna="emas" />
      </>
    ),
  },
  {
    judul: "Catatan & olahraga terpantau",
    teks: "Pengajar dan musyrif menulis catatan keseharian santri: akhlaq, adab, ibadah shalat, dan lainnya. Sesi olahraga Ahad dan Kamis pagi pun tercatat kehadirannya.",
    visual: (
      <>
        <IkonModul modul="catatan" ikon="catatan" warna="kuning" />
        <IkonModul modul="olahraga" ikon="olahraga" warna="emas" />
      </>
    ),
  },
  {
    judul: "Wali hanya melihat data anaknya",
    teks: "Akun wali hanya dapat melihat data anaknya sendiri; data santri lain tidak tampil sama sekali. Data anak muncul setelah admin menautkan akun Anda ke santri.",
    visual: <IkonModul modul="santri" ikon="santri" warna="hijau" />,
  },
];

export default function HalamanSambutan() {
  const router = useRouter();
  const [indeks, setIndeks] = useState(0);
  const slide = SLIDE[indeks];
  const terakhir = indeks === SLIDE.length - 1;

  /** Selesaikan sambutan: catat penanda di perangkat, lanjut /login. */
  function selesai() {
    try {
      localStorage.setItem(KUNCI_SAMBUTAN_SELESAI, "1");
    } catch {
      // Storage tidak tersedia — tetap lanjut ke login; gerbang di
      // login menoleransi penanda yang tidak bisa disimpan.
    }
    router.push("/login");
  }

  return (
    <div className="sambutan-bungkus">
      <div className="sambutan-kartu">
        <div className="sambutan-visual">{slide.visual}</div>
        <div className="sambutan-isi">
          <p className="sambutan-langkah">
            {indeks + 1} dari {SLIDE.length}
          </p>
          <h1 className="sambutan-judul">{slide.judul}</h1>
          <p className="sambutan-teks">{slide.teks}</p>

          <div className="sambutan-titik" aria-label="Pilih slide">
            {SLIDE.map((s, i) => (
              <button
                key={s.judul}
                type="button"
                className="sambutan-titik-tombol"
                aria-label={`Slide ${i + 1}: ${s.judul}`}
                aria-current={i === indeks ? "true" : undefined}
                onClick={() => setIndeks(i)}
              />
            ))}
          </div>

          <div className="sambutan-kendali">
            {terakhir ? (
              <button
                type="button"
                className="tombol tombol-besar tombol-penuh"
                onClick={selesai}
              >
                Masuk
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="tombol tombol-sekunder"
                  onClick={selesai}
                >
                  Lewati
                </button>
                <button
                  type="button"
                  className="tombol tombol-besar"
                  onClick={() => setIndeks((i) => Math.min(i + 1, SLIDE.length - 1))}
                >
                  Berikutnya
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
