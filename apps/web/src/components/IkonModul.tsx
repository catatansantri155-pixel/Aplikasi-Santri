/**
 * Ikon untuk kisi Fast Menu (beranda & halaman Menu).
 *
 * Bila modul punya ikon gambar 3D dari user (src/lib/ikon-modul.ts),
 * tampilkan gambar lingkarannya; bila tidak, kembali ke lingkaran
 * tint berisi ikon garis SVG seperti sebelumnya. Gambar murni
 * dekoratif (alt kosong) — makna disampaikan label di sebelahnya.
 */
import {
  LingkaranIkon,
  type NamaIkon,
  type WarnaTint,
} from "@/components/Ikon";
import { IKON_MODUL_GAMBAR } from "@/lib/ikon-modul";

export default function IkonModul({
  modul,
  ikon,
  warna,
}: {
  modul: string;
  ikon: NamaIkon;
  warna: WarnaTint;
}) {
  const gambar = IKON_MODUL_GAMBAR[modul];
  if (gambar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="ikon-gambar"
        src={gambar}
        alt=""
        width={56}
        height={56}
      />
    );
  }
  return <LingkaranIkon nama={ikon} warna={warna} ukuran={24} besar />;
}
