"use client";

/**
 * Halaman Sambutan — onboarding TERPISAH di depan halaman login
 * (keputusan user 4 Nov 2026): 1 layar sambutan + 4 slide fitur,
 * slide terakhir menuju /login. Tanpa kerangka aplikasi (lihat
 * PATH_TANPA_KERANGKA di komponen Kerangka).
 *
 * Penyelarasan PROTOTIPE (perintah user 4 Nov 2026 sore): tampilan
 * mengikuti prototipe Intro persis — satu kolom tengah di semua
 * ukuran layar, Lewati hantu di kanan atas, panel visual tint
 * lembut berpola bintang dengan kartu ikon putih melayang +
 * berlian emas, teks terpusat, titik penanda + tombol Lanjut/Mulai
 * di baris bawah. Isi 5 slide dan logika penanda tidak berubah.
 *
 * Selesai / Lewati / Mulai → penanda localStorage
 * `santri.sambutan.selesai` = "1" (lib/sesi.ts) lalu ke /login;
 * gerbangnya ada di halaman login (pengunjung tanpa sesi yang belum
 * punya penanda dialihkan ke sini). Halaman ini sendiri selalu bisa
 * dibuka langsung, juga setelah penanda ada (tautan "Lihat
 * perkenalan" di halaman login menunjuk ke sini).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ikon, type NamaIkon } from "@/components/Ikon";
import Logo from "@/components/Logo";
import Pola from "@/components/Pola";
import { KUNCI_SAMBUTAN_SELESAI } from "@/lib/sesi";

interface Slide {
  judul: string;
  teks: string;
  /** Ikon garis di kartu visual; "logo" khusus slide sambutan. */
  ikon: NamaIkon | "logo";
}

const SLIDE: Slide[] = [
  {
    judul: "Selamat datang di Aplikasi Santri",
    teks: "Aplikasi monitoring santri Ponpes Minhajus Sunnah Magelang · Marhalah Wustha. Hafalan, nilai, kehadiran, dan keseharian santri terpantau dalam satu tempat.",
    ikon: "logo",
  },
  {
    judul: "Hafalan tercatat rapi",
    teks: "Setoran harian Buku Hafalan (BC, BR, TS, LM) dan tes semester per juz tercatat dengan nilai otomatis, lengkap dengan grafik progres pekanan dan bulanan.",
    ikon: "hifzh",
  },
  {
    judul: "Diniyyah & kehadiran jelas",
    teks: "Nilai harian dan nilai ujian semester diniyyah tercatat per mata pelajaran. Kehadiran setiap sesi hifzh maupun diniyyah terisi Hadir, Sakit, Izin, atau Alpa.",
    ikon: "diniyyah",
  },
  {
    judul: "Catatan & olahraga terpantau",
    teks: "Pengajar dan musyrif menulis catatan keseharian santri: akhlaq, adab, ibadah shalat, dan lainnya. Sesi olahraga Ahad dan Kamis pagi pun tercatat kehadirannya.",
    ikon: "catatan",
  },
  {
    judul: "Wali hanya melihat data anaknya",
    teks: "Akun wali hanya dapat melihat data anaknya sendiri; data santri lain tidak tampil sama sekali. Data anak muncul setelah admin menautkan akun Anda ke santri.",
    ikon: "perisai",
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
      <div className="sambutan-atas">
        <button type="button" className="tombol tombol-hantu" onClick={selesai}>
          Lewati
        </button>
      </div>

      <div className="sambutan-visual">
        <Pola className="sambutan-visual-pola" />
        <div className="sambutan-visual-kartu">
          {slide.ikon === "logo" ? (
            <Logo ukuran={56} />
          ) : (
            <Ikon nama={slide.ikon} ukuran={44} />
          )}
        </div>
        <span className="sambutan-visual-berlian" aria-hidden="true" />
      </div>

      <div className="sambutan-isi">
        <h1 className="sambutan-judul">{slide.judul}</h1>
        <p className="sambutan-teks">{slide.teks}</p>
      </div>

      <div className="sambutan-bawah">
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
        {terakhir ? (
          <button
            type="button"
            className="tombol sambutan-tombol-lanjut"
            onClick={selesai}
          >
            Mulai
          </button>
        ) : (
          <button
            type="button"
            className="tombol sambutan-tombol-lanjut"
            onClick={() =>
              setIndeks((i) => Math.min(i + 1, SLIDE.length - 1))
            }
          >
            Lanjut
          </button>
        )}
      </div>
    </div>
  );
}
