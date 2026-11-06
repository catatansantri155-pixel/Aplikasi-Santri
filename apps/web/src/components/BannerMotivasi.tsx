"use client";
import { useEffect, useState } from "react";
export const BANNER_MOTIVASI = [
  ["Ruang belajar", "Buku, tanaman, dan lampu di ruang belajar pondok."],
  ["Ruang mengaji", "Al-Qur’an, rehal kayu, alas duduk, dan lentera."],
  ["Persiapan belajar", "Papan kehadiran, jam, dan alat tulis."],
  ["Catatan belajar", "Buku catatan terbuka dengan pena dan pembatas buku."],
  [
    "Perlengkapan olahraga",
    "Bola, botol minum, dan handuk di lingkungan pondok.",
  ],
  ["Lingkungan pondok", "Bangunan pondok dengan taman dan halaman yang asri."],
  ["Langkah kebaikan", "Jalan setapak menuju gerbang taman dan tanaman muda."],
];
export default function BannerMotivasi() {
  const [aktif, setAktif] = useState(0),
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
    if (hover || fokus || !terlihat || kurangiGerak) return;
    const id = window.setInterval(() => setAktif((i) => (i + 1) % 7), 7000);
    return () => window.clearInterval(id);
  }, [hover, fokus, terlihat, kurangiGerak, aktif]);
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
          src={`/images/banner/suasana-${aktif + 1}.webp`}
          width={2172}
          height={724}
          alt={`${BANNER_MOTIVASI[aktif][0]}. ${BANNER_MOTIVASI[aktif][1]}`}
          decoding="async"
          loading="lazy"
        />
      </div>
      <div className="banner-kontrol">
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
      </div>
    </section>
  );
}
