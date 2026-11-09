"use client";
import { Ikon } from "@/components/Ikon";
import Link from "next/link";
import { useState } from "react";
import type { InformasiPondok } from "@/lib/data/informasi";
export default function KartuInformasi({
  data: b,
  ringkas = false,
  tautanDetail = false,
  onUbah,
  onHapus,
  onPulihkan,
  sibuk = false,
}: {
  data: InformasiPondok;
  ringkas?: boolean;
  tautanDetail?: boolean;
  onUbah?: () => void;
  onHapus?: () => void;
  onPulihkan?: () => void;
  sibuk?: boolean;
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
          {}
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
          {b.disematkan && <span className="lencana">Disematkan</span>}
          <time dateTime={b.tanggal}>
            {new Date(`${b.tanggal}T00:00:00`).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          {b.status === "draf" && <span className="lencana">Draf</span>}
        </div>
        {b.berakhir_pada && (
          <p className="informasi-batas">
            Tayang sampai{" "}
            {new Date(b.berakhir_pada).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
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
          {(ringkas || tautanDetail) && (
            <Link
              href={`/informasi/${b.id}`}
              className="aksi-ringkas aksi-ringkas-teks"
            >
              {ringkas
                ? "Baca selengkapnya"
                : onUbah
                  ? "Rincian & pembacaan"
                  : b.wajib_konfirmasi
                    ? "Baca & konfirmasi"
                    : "Buka informasi"}
              <Ikon nama="chevron-kanan" ukuran={16} />
            </Link>
          )}
          {onHapus && (
            <button
              type="button"
              className="tombol tombol-kecil tombol-sekunder info-hapus"
              disabled={sibuk}
              onClick={onHapus}
            >
              <Ikon nama="hapus" ukuran={16} />
              Hapus
            </button>
          )}
          {onPulihkan && (
            <button
              type="button"
              className="tombol tombol-kecil tombol-sekunder"
              disabled={sibuk}
              onClick={onPulihkan}
            >
              Pulihkan sebagai draf
            </button>
          )}
          {bergambar && (
            <a
              className="aksi-ringkas aksi-ringkas-netral aksi-media"
              href={b.gambar_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Lihat gambar utuh: ${b.judul} (tab baru)`}
            >
              <Ikon nama="gambar" ukuran={18} />
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
