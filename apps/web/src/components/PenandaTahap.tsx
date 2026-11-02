import type { ReactNode } from "react";

/** Penanda seragam bahwa halaman masih scaffold / berisi data contoh. */
export default function PenandaTahap({
  teks = "DATA CONTOH · TAHAP SCAFFOLD",
}: {
  teks?: string;
}) {
  return <p className="penanda-tahap">{teks}</p>;
}

export function KartuPlaceholder({
  judul,
  children,
}: {
  judul: string;
  children: ReactNode;
}) {
  return (
    <section className="kartu">
      <h2>{judul}</h2>
      {children}
    </section>
  );
}
