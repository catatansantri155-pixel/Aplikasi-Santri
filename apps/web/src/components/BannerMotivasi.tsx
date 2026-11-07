"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ikon } from "@/components/Ikon";
import { supabaseTerhubung } from "@/lib/data/santri";
import { ambilBanner, PONDOK_BERUBAH } from "@/lib/data/pondok-layanan";
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
export default function BannerMotivasi({ admin = false }: { admin?: boolean }) {
  const contoh = !supabaseTerhubung();
  const [slides, setSlides] = useState(() =>
      contoh
        ? BANNER_MOTIVASI.map(([judul, alt], i) => ({
            id: String(i),
            judul,
            alt,
            gambar_url: `/images/banner/suasana-${i + 1}.webp`,
          }))
        : [],
    ),
    [muat, setMuat] = useState(!contoh),
    [galat, setGalat] = useState("");
  const [aktif, setAktif] = useState(0),
    [hover, setHover] = useState(false),
    [fokus, setFokus] = useState(false),
    [terlihat, setTerlihat] = useState(true),
    [kurangiGerak, setKurangiGerak] = useState(true);
  useEffect(() => {
    if (contoh) return;
    let hidup = true;
    async function refresh() {
      try {
        const d = await ambilBanner();
        if (hidup) {
          setSlides(
            d.map((b) => ({
              id: b.id,
              judul: b.judul,
              alt: b.judul,
              gambar_url: b.gambar_url ?? "",
            })),
          );
          setAktif((i) => Math.min(i, Math.max(0, d.length - 1)));
          setGalat("");
        }
      } catch {
        if (hidup) setGalat("Banner belum dapat dimuat.");
      } finally {
        if (hidup) setMuat(false);
      }
    }
    void refresh();
    window.addEventListener(PONDOK_BERUBAH, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      hidup = false;
      window.removeEventListener(PONDOK_BERUBAH, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [contoh]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const perbarui = () => setKurangiGerak(media.matches),
      visibilitas = () => setTerlihat(!document.hidden);
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
    if (hover || fokus || !terlihat || kurangiGerak || slides.length < 2)
      return;
    const id = window.setInterval(
      () => setAktif((i) => (i + 1) % slides.length),
      7000,
    );
    return () => window.clearInterval(id);
  }, [hover, fokus, terlihat, kurangiGerak, slides.length, aktif]);
  if (muat)
    return (
      <div
        className="banner-skeleton"
        role="status"
        aria-label="Memuat banner"
      />
    );
  if (!slides.length)
    return admin ? (
      <section className="banner-kosong">
        <p>{galat || "Belum ada banner yang ditayangkan."}</p>
        <Link href="/banner" className="tombol tombol-sekunder">
          Kelola banner
        </Link>
      </section>
    ) : null;
  const slide = slides[Math.min(aktif, slides.length - 1)];
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
        <img
          src={slide.gambar_url}
          width={2172}
          height={724}
          alt={slide.alt}
          decoding="async"
          loading="lazy"
        />
      </div>
      {admin && (
        <Link
          href="/banner"
          className="banner-kelola"
          aria-label="Kelola banner beranda"
          title="Kelola banner"
        >
          <Ikon nama="pena" ukuran={17} />
        </Link>
      )}
      {slides.length > 1 && (
        <div className="banner-kontrol">
          <div
            className="banner-indikator"
            role="group"
            aria-label="Pilih banner"
          >
            {slides.map((b, i) => (
              <button
                type="button"
                key={b.id}
                aria-label={`Banner ${i + 1}: ${b.judul}`}
                aria-current={i === aktif ? "true" : undefined}
                onClick={() => setAktif(i)}
              >
                <span />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
