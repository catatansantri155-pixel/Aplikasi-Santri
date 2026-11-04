"use client";

/**
 * Banner motivasi beranda — SLIDER 5 hadis (arahan user
 * 4 Nov 2026, menggantikan kartu hadis tunggal sebelumnya).
 *
 * - Lima slide hadis: teks Arab (huruf Amiri lewat .teks-arab),
 *   terjemahan Indonesia, dan sumber — isinya tetap, bukan data
 *   database.
 * - Bergeser OTOMATIS tiap ±5 detik; titik penanda di bawah kartu
 *   bisa diketuk untuk melompat ke slide tertentu (ketukan juga
 *   mengulang hitungan jeda dari awal).
 * - Pengguna yang meminta gerakan dikurangi (prefers-reduced-motion
 *   di sistem) tidak digeser otomatis; titik tetap bisa diketuk.
 * - Gaya visual meneruskan kartu hadis lama: bidang tint emas
 *   (.banner-motivasi di globals.css) + pola bintang emas.
 */
import { useEffect, useState } from "react";
import Pola from "@/components/Pola";

const SLIDE_MOTIVASI: {
  arab: string;
  terjemahan: string;
  sumber: string;
}[] = [
  {
    arab: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    terjemahan:
      "Sebaik-baik kalian adalah yang belajar Al-Qur'an dan mengajarkannya.",
    sumber: "HR. Bukhari",
  },
  {
    arab: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ",
    terjemahan:
      "Siapa menempuh jalan untuk mencari ilmu, Allah mudahkan baginya jalan menuju surga.",
    sumber: "HR. Muslim",
  },
  {
    arab: "إِنَّمَا بُعِثْتُ لِأُتَمِّمَ مَكَارِمَ الْأَخْلَاقِ",
    terjemahan:
      "Sesungguhnya aku diutus untuk menyempurnakan akhlak yang mulia.",
    sumber: "HR. Ahmad",
  },
  {
    arab: "أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ",
    terjemahan:
      "Amalan yang paling dicintai Allah adalah yang paling kontinu, meski sedikit.",
    sumber: "HR. Bukhari dan Muslim",
  },
  {
    arab: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ",
    terjemahan: "Menuntut ilmu itu wajib atas setiap muslim.",
    sumber: "HR. Ibnu Majah",
  },
];

/** Jeda geser otomatis antar-slide, milidetik. */
const JEDA_SLIDE_MS = 5000;

export default function BannerMotivasi() {
  const [aktif, setAktif] = useState(0);
  // Penghitung ulang jeda: berubah setiap ketukan titik agar slide
  // yang dipilih bertahan satu jeda penuh sebelum bergeser lagi.
  const [sesi, setSesi] = useState(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setAktif((a) => (a + 1) % SLIDE_MOTIVASI.length);
    }, JEDA_SLIDE_MS);
    return () => window.clearInterval(id);
  }, [sesi]);

  const slide = SLIDE_MOTIVASI[aktif];

  return (
    <div
      className="banner-motivasi"
      aria-roledescription="carousel"
      aria-label="Hadis motivasi"
    >
      <Pola className="motivasi-pola" />
      <div key={aktif} className="motivasi-slide" aria-live="off">
        <p className="motivasi-arab teks-arab" dir="rtl" lang="ar">
          {slide.arab}
        </p>
        <p className="motivasi-teks">
          &ldquo;{slide.terjemahan}&rdquo;
        </p>
        <p className="motivasi-sumber">{slide.sumber}</p>
      </div>
      <div className="motivasi-titik" aria-label="Pilih hadis">
        {SLIDE_MOTIVASI.map((s, i) => (
          <button
            key={s.sumber}
            type="button"
            className="motivasi-titik-tombol"
            aria-current={i === aktif}
            aria-label={`Hadis ${i + 1} dari ${SLIDE_MOTIVASI.length}: ${s.sumber}`}
            onClick={() => {
              setAktif(i);
              setSesi((n) => n + 1);
            }}
          />
        ))}
      </div>
    </div>
  );
}
