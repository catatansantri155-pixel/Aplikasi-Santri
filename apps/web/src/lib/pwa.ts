/** Deteksi jendela aplikasi, bukan bukti keamanan atau klaim instalasi global. */
export function jendelaAplikasi(
  standalone: boolean,
  overlay: boolean,
  iosStandalone?: boolean,
) {
  return standalone || overlay || iosStandalone === true;
}
export function petunjukPemasangan(ua: string, sentuh: number) {
  const ios =
    /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && sentuh > 1);
  if (ios)
    return {
      platform: "iPhone / iPad",
      langkah: [
        "Buka tautan ini di Safari, lalu ketuk Bagikan.",
        "Pilih Tambahkan ke Layar Utama, aktifkan Buka sebagai App jika tersedia, lalu Tambah.",
        "Buka Monitoring Santri dari ikon di layar utama untuk masuk.",
      ],
    };
  if (/Android/i.test(ua))
    return {
      platform: "Android",
      langkah: [
        "Buka tautan ini di Chrome atau Samsung Internet.",
        "Pilih menu browser → Instal aplikasi / Tambahkan ke layar utama. Tombol Pasang juga dapat muncul di halaman ini jika tersedia.",
        "Selesaikan pemasangan, lalu buka Monitoring Santri dari ikon aplikasi.",
      ],
    };
  if (/Macintosh|Mac OS X/i.test(ua))
    return {
      platform: "Mac",
      langkah: [
        "Gunakan Chrome / Edge, atau Safari yang mendukung Tambahkan ke Dock.",
        "Pilih ikon pasang di bilah alamat; di Safari pilih File → Tambahkan ke Dock.",
        "Buka Monitoring Santri dari aplikasi atau Dock, bukan tab browser.",
      ],
    };
  return {
    platform: "Komputer",
    langkah: [
      "Buka tautan ini di Chrome atau Microsoft Edge yang mendukung pemasangan aplikasi.",
      "Pilih ikon pemasangan di bilah alamat atau menu browser → Instal aplikasi. Tombol Pasang juga dapat muncul di halaman ini jika tersedia.",
      "Selesaikan pemasangan, lalu buka Monitoring Santri dari menu aplikasi komputer.",
    ],
  };
}
export interface PermintaanPasang extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
