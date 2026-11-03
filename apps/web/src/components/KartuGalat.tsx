"use client";

/**
 * Kartu keadaan gagal memuat yang seragam untuk semua halaman modul:
 * judul polos, pesan galat apa adanya, dan tombol "Coba lagi" yang
 * menjalankan ulang pemuatan data halaman itu (bukan memuat ulang
 * seluruh halaman). Bila onCobaLagi tidak diberikan, tombol tidak
 * dirender — jangan menampilkan tombol yang tidak bekerja.
 */
export default function KartuGalat({
  pesan,
  onCobaLagi,
}: {
  pesan: string;
  onCobaLagi?: () => void;
}) {
  return (
    <section className="kartu">
      <h2>Data belum bisa dimuat</h2>
      <p>{pesan}</p>
      {onCobaLagi && (
        <p>
          <button
            type="button"
            className="tombol tombol-sekunder"
            onClick={onCobaLagi}
          >
            Coba lagi
          </button>
        </p>
      )}
    </section>
  );
}
