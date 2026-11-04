/**
 * Preferensi tampilan per perangkat (Pengaturan di halaman Akun,
 * arahan user 4 Nov 2026): mode Terang/Gelap dan ukuran teks.
 *
 * Disimpan di localStorage perangkat (bukan data akun — ganti
 * perangkat = kembali ke bawaan) dan diterapkan sebagai atribut
 * `data-tema` / `data-teks` pada elemen <html>; globals.css memetakan
 * atribut itu ke token warna & skala huruf. Skrip sebaris di
 * layout.tsx menerapkan pilihan tersimpan SEBELUM halaman digambar
 * agar tidak ada kedipan tema; fungsi di sini untuk membaca &
 * mengubahnya dari halaman Akun.
 */

export type ModeTema = "terang" | "gelap";
export type UkuranTeks = "kecil" | "standar" | "besar";

export const KUNCI_TEMA = "santri.tampilan.tema";
export const KUNCI_UKURAN_TEKS = "santri.tampilan.teks";

export interface PilihanTampilan {
  tema: ModeTema;
  ukuranTeks: UkuranTeks;
}

/** Tema bawaan: mengikuti setelan sistem perangkat. */
export function temaBawaan(): ModeTema {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "gelap"
      : "terang";
  } catch {
    return "terang";
  }
}

/** Baca pilihan yang sedang berlaku (atribut <html> lebih dulu). */
export function bacaTampilan(): PilihanTampilan {
  let tema: ModeTema = temaBawaan();
  let ukuranTeks: UkuranTeks = "standar";
  try {
    const akar = document.documentElement;
    if (akar.dataset.tema === "gelap" || akar.dataset.tema === "terang") {
      tema = akar.dataset.tema;
    } else {
      const simpan = localStorage.getItem(KUNCI_TEMA);
      if (simpan === "gelap" || simpan === "terang") tema = simpan;
    }
    const teks =
      akar.dataset.teks ?? localStorage.getItem(KUNCI_UKURAN_TEKS);
    if (teks === "kecil" || teks === "standar" || teks === "besar") {
      ukuranTeks = teks;
    }
  } catch {
    // Storage/atribut tak tersedia — pakai bawaan.
  }
  return { tema, ukuranTeks };
}

/** Terapkan + simpan pilihan tampilan di perangkat ini. */
export function terapkanTampilan(pilihan: PilihanTampilan): void {
  try {
    document.documentElement.dataset.tema = pilihan.tema;
    document.documentElement.dataset.teks = pilihan.ukuranTeks;
    localStorage.setItem(KUNCI_TEMA, pilihan.tema);
    localStorage.setItem(KUNCI_UKURAN_TEKS, pilihan.ukuranTeks);
  } catch {
    // Gagal menyimpan tidak menghalangi pemakaian sesi ini.
  }
}
