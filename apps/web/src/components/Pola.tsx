/**
 * Pola bintang delapan (Islamic star) — lapisan dekoratif prototipe
 * Lovable, dipakai di kartu hero beranda, kartu hadis, panel auth,
 * dan visual sambutan. Warna mengikuti `currentColor` pemanggil;
 * pemanggil mengatur posisi (absolute) + opasitas lewat className/
 * style. Id pola dibuat unik per pemakaian agar beberapa pola bisa
 * hidup di satu halaman.
 */
import { useId, type CSSProperties } from "react";

export default function Pola({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const id = `pola-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <path
            d="M28 6 L33 23 L50 28 L33 33 L28 50 L23 33 L6 28 L23 23 Z"
            fill="currentColor"
            opacity="0.5"
          />
          <path
            d="M0 0 L5 5 M56 0 L51 5 M0 56 L5 51 M56 56 L51 51"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.35"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
