"use client";
import { useEffect, useState } from "react";
export const BANNER_MOTIVASI = [
  [
    "Ilmu Tumbuh dengan Adab",
    "Belajar dengan sungguh-sungguh, bersikap dengan santun.",
  ],
  ["Jaga Hafalan, Setiap Hari", "Sedikit demi sedikit, terus diperbaiki."],
  [
    "Disiplin Hadir, Siap Belajar",
    "Datang tepat waktu, siapkan hati dan pikiran.",
  ],
  ["Catatan Kecil, Perubahan Baik", "Kenali kemajuan, perbaiki kebiasaan."],
  [
    "Sehat Badan, Semangat Belajar",
    "Bergerak aktif, istirahat cukup, jaga kebersihan.",
  ],
  ["Bersama Mendampingi Santri", "Pondok dan wali saling mendukung."],
  [
    "Langkah Baik Dimulai Hari Ini",
    "Niatkan kebaikan, mulai dari yang sederhana.",
  ],
];
export default function BannerMotivasi() {
  const [aktif, setAktif] = useState(0),
    [jeda, setJeda] = useState(false),
    [hover, setHover] = useState(false),
    [fokus, setFokus] = useState(false),
    [terlihat, setTerlihat] = useState(true),
    [kurangiGerak, setKurangiGerak] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const perbarui = () => setKurangiGerak(media.matches);
    const visibilitas = () => setTerlihat(!document.hidden);
    perbarui();
    visibilitas();
    media.addEventListener("change", perbarui);
    document.addEventListener("visibilitychange", visibilitas);
    return () => {
      media.removeEventListener("change", perbarui);
      document.removeEventListener("visibilitychange", visibilitas);
    };
  }, []);
  useEffect(() => {
    if (jeda || hover || fokus || !terlihat || kurangiGerak) return;
    const id = window.setInterval(() => setAktif((i) => (i + 1) % 7), 7000);
    return () => window.clearInterval(id);
  }, [jeda, hover, fokus, terlihat, kurangiGerak, aktif]);
  return (
    <section
      className="banner-gambar"
      aria-roledescription="carousel"
      aria-label="Motivasi santri"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setFokus(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setFokus(false);
      }}
    >
      <div className="banner-gambar-bidang" aria-live="off">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/banner/motivasi-${aktif + 1}.webp`}
          width={2172}
          height={724}
          alt={`${BANNER_MOTIVASI[aktif][0]}. ${BANNER_MOTIVASI[aktif][1]}`}
          decoding="async"
        />
      </div>
      <p className="banner-keterangan" aria-hidden="true">
        {BANNER_MOTIVASI[aktif][1]}
      </p>
      <div className="banner-kontrol">
        <button
          type="button"
          aria-label="Banner sebelumnya"
          onClick={() => setAktif((i) => (i + 6) % 7)}
        >
          ‹
        </button>
        <div
          className="banner-indikator"
          role="group"
          aria-label="Pilih banner"
        >
          {BANNER_MOTIVASI.map(([judul], i) => (
            <button
              type="button"
              key={judul}
              aria-label={`Banner ${i + 1}: ${judul}`}
              aria-current={i === aktif ? "true" : undefined}
              onClick={() => setAktif(i)}
            >
              <span />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Banner berikutnya"
          onClick={() => setAktif((i) => (i + 1) % 7)}
        >
          ›
        </button>
        <button
          type="button"
          aria-pressed={jeda}
          onClick={() => setJeda((v) => !v)}
        >
          {jeda ? "Lanjutkan" : "Jeda"}
        </button>
      </div>
    </section>
  );
}
