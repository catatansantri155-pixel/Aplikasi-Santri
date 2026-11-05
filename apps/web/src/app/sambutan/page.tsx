"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KUNCI_SAMBUTAN_SELESAI } from "@/lib/sesi";
import MerekAkses from "@/components/MerekAkses";
import VisualAkses from "@/components/VisualAkses";

const SLIDE = [
  {
    judul: "Ahlan wa sahlan.",
    teks: "Selamat datang di Monitoring Santri Minhajus Sunnah Magelang. Dampingi proses belajar, hafalan, dan keseharian santri dalam satu tempat.",
    label: "Selamat datang",
  },
  {
    judul: "Hafalan tercatat, progres terlihat.",
    teks: "Catat setoran Buku Hafalan dan tes per juz. Ikuti perkembangan hafalan melalui riwayat dan laporan yang tersedia.",
    label: "Hafalan",
  },
  {
    judul: "Belajar dan hadir dengan tertib.",
    teks: "Nilai diniyyah dan kehadiran setiap sesi tercatat rapi, sehingga perkembangan belajar lebih mudah ditinjau.",
    label: "Nilai & kehadiran",
  },
  {
    judul: "Keseharian juga mendapat perhatian.",
    teks: "Catatan adab, ibadah, dan kegiatan olahraga melengkapi gambaran perkembangan santri.",
    label: "Keseharian",
  },
  {
    judul: "Terhubung sesuai peran Anda.",
    teks: "Pengajar dan musyrif memakai akun dari admin. Wali dapat mendaftar; data anak tampil setelah akun ditautkan oleh admin.",
    label: "Akses akun",
  },
];

export default function HalamanSambutan() {
  const router = useRouter();
  const [indeks, setIndeks] = useState(0);
  const slide = SLIDE[indeks];
  const terakhir = indeks === SLIDE.length - 1;
  function selesai() {
    try {
      localStorage.setItem(KUNCI_SAMBUTAN_SELESAI, "1");
    } catch {
      /* Tanpa storage, login tetap dapat dibuka. */
    }
    router.push("/login");
  }
  return (
    <div className="akses-shell akses-sambutan">
      <header className="akses-header">
        <MerekAkses />
        <button className="akses-lewati" type="button" onClick={selesai}>
          Lewati
        </button>
      </header>
      <main className="perkenalan-grid">
        <div className="perkenalan-panggung">
          <VisualAkses />
          <span className="perkenalan-badge">Hafalan · Ilmu · Adab</span>
        </div>
        <section className="perkenalan-kartu" aria-label="Perkenalan aplikasi">
          <span className="akses-kicker">
            MONITORING SANTRI · MARHALAH WUSTHA
          </span>
          {indeks === 0 && (
            <p className="perkenalan-salam">
              Assalamu’alaikum warahmatullahi wabarakatuh
            </p>
          )}
          <div className="perkenalan-isi" aria-live="polite" aria-atomic="true">
            <h1>{slide.judul}</h1>
            <p>{slide.teks}</p>
          </div>
          <div className="perkenalan-progres">
            <span>
              {String(indeks + 1).padStart(2, "0")}{" "}
              <small>/ {String(SLIDE.length).padStart(2, "0")}</small>
            </span>
            <span>{slide.label}</span>
          </div>
          <div
            className="perkenalan-titik"
            role="group"
            aria-label="Pilih bagian perkenalan"
          >
            {SLIDE.map((s, i) => (
              <button
                key={s.label}
                type="button"
                aria-label={`Bagian ${i + 1}: ${s.label}`}
                aria-current={i === indeks ? "step" : undefined}
                onClick={() => setIndeks(i)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="perkenalan-aksi">
            {indeks > 0 && (
              <button
                type="button"
                className="akses-sekunder"
                onClick={() => setIndeks((i) => Math.max(0, i - 1))}
              >
                Kembali
              </button>
            )}
            <button
              className="tombol akses-primer"
              type="button"
              onClick={
                terakhir
                  ? selesai
                  : () => setIndeks((i) => Math.min(i + 1, SLIDE.length - 1))
              }
            >
              {terakhir ? "Masuk ke aplikasi" : "Lanjut"}
            </button>
          </div>
        </section>
      </main>
      <footer className="akses-footer">
        Minhajus Sunnah Magelang · Mendampingi tumbuhnya ilmu dan adab
      </footer>
    </div>
  );
}
