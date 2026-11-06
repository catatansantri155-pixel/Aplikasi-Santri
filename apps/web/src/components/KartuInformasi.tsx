"use client";
import Link from "next/link";
import { useState } from "react";
import type { InformasiPondok } from "@/lib/data/informasi";
export default function KartuInformasi({
  data: b,
  ringkas = false,
  onUbah,
}: {
  data: InformasiPondok;
  ringkas?: boolean;
  onUbah?: () => void;
}) {
  const [gambarGagal, setGambarGagal] = useState(false);
  const bergambar = Boolean(b.gambar_url) && !gambarGagal;
  return (
    <article
      id={`info-${b.id}`}
      className={`informasi-kartu informasi-tema-${b.tema ?? "hijau"}${bergambar ? " informasi-kartu-bergambar" : ""}`}
    >
      {bergambar && (
        <div className="informasi-sampul">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.gambar_url}
            alt={b.judul}
            loading="lazy"
            onError={() => setGambarGagal(true)}
          />
          <div className="informasi-sampul-judul">
            <h3 title={b.judul}>{b.judul}</h3>
          </div>
        </div>
      )}
      <div className="informasi-konten">
        <div className="informasi-meta">
          <span>{b.kategori}</span>
          <time dateTime={b.tanggal}>
            {new Date(`${b.tanggal}T00:00:00`).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          {b.status === "draf" && <span className="lencana">Draf</span>}
        </div>
        {!bergambar && <h3>{b.judul}</h3>}
        {b.gambar_path && !bergambar && (
          <p className="catatan-kaki">
            Gambar belum tersedia. Muat ulang halaman untuk mencoba lagi.
          </p>
        )}
        {b.isi && (
          <p className="informasi-isi">
            {ringkas && b.isi.length > 180 ? `${b.isi.slice(0, 180)}…` : b.isi}
          </p>
        )}
        <div className="informasi-aksi">
          {ringkas && (
            <Link href={`/informasi#info-${b.id}`}>Baca selengkapnya</Link>
          )}
          {bergambar && (
            <a href={b.gambar_url} target="_blank" rel="noopener noreferrer">
              Lihat gambar utuh
            </a>
          )}
          {onUbah && (
            <button
              type="button"
              className="tombol tombol-kecil tombol-sekunder"
              onClick={onUbah}
            >
              Ubah informasi
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
