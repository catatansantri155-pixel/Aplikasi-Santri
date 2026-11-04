/**
 * Logo Aplikasi Santri — mengikuti prototipe Lovable persis: dua
 * persegi membulat yang diputar 45° bertumpuk (opasitas berlapis)
 * dengan potongan buku terbuka di tengah. Warna mengikuti
 * `currentColor` pemanggil; isi buku memakai warna permukaan agar
 * terbaca sebagai potongan (cut-out) di latar apa pun.
 */
import type { CSSProperties } from "react";

export default function Logo({
  ukuran = 36,
  className,
  style,
}: {
  ukuran?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={ukuran}
      height={ukuran}
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="10"
        y="6"
        width="28"
        height="28"
        rx="7"
        transform="rotate(45 24 20)"
        fill="currentColor"
        opacity="0.22"
      />
      <rect
        x="10"
        y="12"
        width="28"
        height="28"
        rx="7"
        transform="rotate(45 24 26)"
        fill="currentColor"
        opacity="0.45"
      />
      <path
        d="M24 17c-1.8-1.5-4.2-2.2-7-2v13c2.8-.2 5.2.5 7 2 1.8-1.5 4.2-2.2 7-2V15c-2.8-.2-5.2.5-7 2Z"
        fill="var(--permukaan)"
      />
      <path d="M24 17v13" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
