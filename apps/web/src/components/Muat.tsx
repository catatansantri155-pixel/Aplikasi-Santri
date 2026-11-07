/**
 * Komponen PEMUATAN MODERN bersama (perintah user 7 Nov 2026):
 * pengganti teks polos "Memuat …" dan layar kosong saat menunggu.
 *
 * - Putaran: indikator putar modern untuk aksi tombol yang sedang
 *   berjalan (simpan, masuk, daftar, dsb.) — mengikuti warna teks
 *   induknya lewat currentColor.
 * - PenandaMuat: putaran + teks terpusat untuk keadaan memuat di
 *   dalam seksi/kartu (pemeriksaan akses, tabel, dsb.).
 * - Rangka*: kerangka (skeleton) berkilaui yang meniru bentuk
 *   kartu/daftar/grafik tujuan, dipakai keadaan memuat halaman dan
 *   berkas loading.tsx rute.
 *
 * Murni presentasi: tanpa logika data, tanpa kait (hooks), aman
 * dirender di server maupun klien.
 */
import type { CSSProperties } from "react";

export function Putaran({ ukuran = 18 }: { ukuran?: number }) {
  const gaya: CSSProperties = { width: ukuran, height: ukuran };
  return <span className="putaran" style={gaya} aria-hidden="true" />;
}

export function PenandaMuat({ teks }: { teks: string }) {
  return (
    <div className="penanda-muat" role="status">
      <Putaran ukuran={20} />
      <span>{teks}</span>
    </div>
  );
}

function Blok({ style }: { style?: CSSProperties }) {
  return <div className="rangka" style={style} aria-hidden="true" />;
}

/** Kerangka daftar: kartu berisi baris avatar + dua baris teks. */
export function RangkaDaftar({ jumlah = 5 }: { jumlah?: number }) {
  return (
    <div className="daftar-kartu" role="status" aria-label="Memuat daftar">
      {Array.from({ length: jumlah }).map((_, i) => (
        <div className="rangka-baris" key={i}>
          <Blok style={{ width: 40, height: 40, borderRadius: "50%" }} />
          <div className="rangka-teks">
            <Blok style={{ height: 12, width: "55%" }} />
            <Blok style={{ height: 10, width: "35%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kerangka bidang tunggal: untuk grafik/tabel di dalam kartu
 *  yang sudah ada (tanpa kartu ganda). */
export function RangkaBidang({ tinggi = 160 }: { tinggi?: number }) {
  return <Blok style={{ height: tinggi, width: "100%" }} />;
}

/** Kerangka satu kartu isi: judul + beberapa baris teks. */
export function RangkaKartu() {
  return (
    <div className="kartu" role="status" aria-label="Memuat kartu">
      <Blok style={{ height: 16, width: "45%", marginBottom: 12 }} />
      <Blok style={{ height: 12, width: "90%", marginBottom: 8 }} />
      <Blok style={{ height: 12, width: "75%", marginBottom: 8 }} />
      <Blok style={{ height: 12, width: "60%" }} />
    </div>
  );
}

/** Kerangka grafik: kartu dengan bidang gambar tinggi. */
export function RangkaGrafik() {
  return (
    <div className="kartu" role="status" aria-label="Memuat grafik">
      <Blok style={{ height: 16, width: "50%", marginBottom: 12 }} />
      <Blok style={{ height: 180, width: "100%" }} />
    </div>
  );
}

/** Kerangka satu halaman penuh: judul, subjudul, lalu kartu/daftar. */
export function RangkaHalaman({
  daftar = false,
}: {
  daftar?: boolean;
}) {
  return (
    <div role="status" aria-label="Memuat halaman">
      <Blok style={{ height: 22, width: "50%", marginBottom: 8 }} />
      <Blok style={{ height: 13, width: "75%", marginBottom: 20 }} />
      {daftar ? (
        <RangkaDaftar jumlah={6} />
      ) : (
        <>
          <RangkaKartu />
          <RangkaKartu />
        </>
      )}
    </div>
  );
}
