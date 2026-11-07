"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import RincianAktivitas from "@/components/RincianAktivitas";
import BannerMotivasi from "@/components/BannerMotivasi";
import InformasiPondok from "@/components/InformasiPondok";
import { Ikon } from "@/components/Ikon";
import { cariDiBeranda, menuUtamaBeranda, gambarMenu } from "@/lib/beranda";
import type { ProfilLogin } from "@/lib/sesi";
import type { Santri } from "@/lib/data/santri";

export interface StatistikBeranda {
  santri: number;
  kehadiran: number;
  setoran: number;
  catatan: number;
  olahraga: number;
}

interface Props {
  profil: Pick<ProfilLogin, "nama" | "peran"> | null;
  memuatProfil: boolean;
  memuatData: boolean;
  modeContoh: boolean;
  statistik: StatistikBeranda | null;
  santri: Santri[];
  galat: boolean;
  onMuatUlang: () => void;
  children?: ReactNode;
}

const AKSI = {
  admin: { href: "/laporan", label: "Lihat Laporan" },
  pengajar_hifzh: { href: "/hifzh", label: "Catat Setoran" },
  pengajar_diniyyah: { href: "/diniyyah", label: "Isi Nilai" },
  musyrif: { href: "/catatan", label: "Tulis Catatan" },
  wali: { href: "/laporan", label: "Perkembangan Anak" },
};

export default function BerandaMonitoring({
  profil,
  memuatProfil,
  memuatData,
  modeContoh,
  statistik,
  santri,
  galat,
  onMuatUlang,
  children,
}: Props) {
  const [pencarian, setPencarian] = useState("");
  const modul = useMemo(
    () => menuUtamaBeranda(profil?.peran ?? null),
    [profil?.peran],
  );
  const hasil = useMemo(
    () => cariDiBeranda(pencarian, modul, santri),
    [pencarian, modul, santri],
  );
  const adaPencarian = pencarian.trim().length > 0;
  const aksi = profil ? AKSI[profil.peran] : null;
  const wali = profil?.peran === "wali";

  return (
    <div className="beranda-monitoring">
      <div className="beranda-desktop-judul">
        <div>
          <span>RUANG KERJA PONDOK</span>
          <h1>Dashboard pondok</h1>
          <p>Kelola kegiatan dan pantau perkembangan santri.</p>
        </div>
        {aksi && (
          <Link href={aksi.href} className="tombol">
            {aksi.label}
            <Ikon nama="chevron-kanan" ukuran={16} />
          </Link>
        )}
      </div>
      <section
        className="beranda-hero"
        aria-label="Monitoring Santri Minhajus Sunnah"
      >
        <div className="beranda-profil">
          <span className="beranda-tanda" aria-hidden="true">
            <Logo ukuran={40} />
          </span>
          <div className="beranda-identitas">
            <p>Assalamu&rsquo;alaikum,</p>
            <strong>
              {memuatProfil
                ? "Memuat akun…"
                : (profil?.nama ?? "Selamat datang")}
            </strong>
            <span>Minhajus Sunnah · Magelang</span>
          </div>
        </div>

        <div className="beranda-cari">
          <Ikon nama="cari" ukuran={21} />
          <input
            type="search"
            value={pencarian}
            onChange={(e) => setPencarian(e.target.value)}
            placeholder="Cari santri atau modul…"
            aria-label="Cari santri atau modul"
            aria-controls={adaPencarian ? "hasil-cari-beranda" : undefined}
            autoComplete="off"
          />
        </div>

        {adaPencarian && (
          <section
            id="hasil-cari-beranda"
            className="beranda-hasil-cari"
            aria-label="Hasil pencarian"
          >
            <div className="hasil-cari-kepala">
              <strong>Hasil pencarian</strong>
              <button type="button" onClick={() => setPencarian("")}>
                Tutup
              </button>
            </div>
            <p className="hasil-cari-status" role="status">
              {hasil.modul.length} modul · {hasil.santri.length} santri
              {memuatData ? " · Memuat data santri…" : ""}
            </p>
            {hasil.modul.length > 0 && (
              <div className="hasil-cari-kelompok">
                <h2>Modul</h2>
                {hasil.modul.map((m) => (
                  <Link key={m.href} href={m.href}>
                    <Ikon nama={m.ikon} ukuran={18} />
                    <span>{m.label}</span>
                    <Ikon nama="chevron-kanan" ukuran={14} />
                  </Link>
                ))}
              </div>
            )}
            {hasil.santri.length > 0 && (
              <div className="hasil-cari-kelompok">
                <h2>{wali ? "Anak Anda" : "Santri"}</h2>
                {hasil.santri.slice(0, 5).map((s) => (
                  <Link key={s.id} href={`/santri/${s.id}`}>
                    <Ikon nama="santri" ukuran={18} />
                    <span>
                      {s.nama}
                      <small>{s.kelasNama}</small>
                    </span>
                    <Ikon nama="chevron-kanan" ukuran={14} />
                  </Link>
                ))}
                {hasil.santri.length > 5 && (
                  <Link href="/santri">
                    Buka daftar santri <Ikon nama="chevron-kanan" ukuran={14} />
                  </Link>
                )}
              </div>
            )}
            {!memuatData &&
              hasil.modul.length === 0 &&
              hasil.santri.length === 0 && (
                <p className="hasil-cari-kosong">
                  Tidak ada hasil yang cocok. Coba nama santri atau modul
                  lainnya.
                </p>
              )}
            {galat && (
              <p className="hasil-cari-kosong">
                Data santri belum berhasil dimuat. Pencarian modul tetap
                tersedia.
              </p>
            )}
          </section>
        )}

        <div className="beranda-intro">
          <div className="beranda-intro-teks">
            <h1>
              MONITORING
              <br />
              SANTRI
            </h1>
            <p>Hafalan, kehadiran, dan perkembangan dalam satu aplikasi.</p>
            {aksi && (
              <Link href={aksi.href} className="beranda-tombol-utama">
                {aksi.label}
              </Link>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="beranda-ilustrasi"
            src="/images/santri-study-hero.webp"
            width={384}
            height={384}
            alt="Ruang mengaji dengan Al-Qur’an, rehal, dan alas duduk"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </section>

      <div className="beranda-isi">
        {modeContoh && (
          <p className="beranda-mode-contoh">
            Mode contoh · Seluruh angka berasal dari data latihan.
          </p>
        )}
        {!memuatProfil && !profil && (
          <p className="pesan-galat" role="alert">
            Profil akun belum tersedia. Hubungi admin untuk menyiapkan akses
            Anda.
          </p>
        )}
        <section
          className="beranda-modul-panel"
          aria-labelledby="judul-menu-beranda"
        >
          <div className="beranda-kepala-seksi">
            <h2 id="judul-menu-beranda">Menu Utama</h2>
            <Link href="/lainnya">
              Lainnya <Ikon nama="chevron-kanan" ukuran={14} />
            </Link>
          </div>
          <div className="beranda-menu" data-jumlah={modul.length}>
            {memuatProfil
              ? Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="beranda-menu-skeleton"
                    aria-hidden="true"
                  />
                ))
              : modul.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="beranda-menu-item"
                  >
                    {/* Gambar 3D asli dari versi sebelumnya; label menjadi nama aksesibel. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className="beranda-menu-lingkaran">
                      <img
                        className="beranda-menu-gambar"
                        src={gambarMenu(m)}
                        alt=""
                        width={72}
                        height={72}
                      />
                    </span>
                    <span className="beranda-menu-label">
                      {m.label}
                      <small className="beranda-menu-keterangan">
                        {m.keterangan}
                      </small>
                    </span>
                  </Link>
                ))}
          </div>
        </section>

        <BannerMotivasi admin={profil?.peran === "admin"} />
        {profil && <InformasiPondok ringkas peran={profil.peran} />}
        <div className="beranda-pelengkap">{children}</div>
        {profil && (
          <RincianAktivitas
            statistik={statistik}
            wali={wali}
            memuat={memuatData}
            galat={galat}
            onMuatUlang={onMuatUlang}
          />
        )}
      </div>
    </div>
  );
}
