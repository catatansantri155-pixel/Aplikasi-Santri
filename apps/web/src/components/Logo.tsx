import type { CSSProperties } from "react";

/** Satu aset resmi untuk semua lokasi; tidak dipotong atau diberi tint. */
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/minhajus-sunnah.webp"
      width={ukuran}
      height={ukuran}
      alt="Logo Minhajus Sunnah Magelang"
      className={`logo-pondok${className ? ` ${className}` : ""}`}
      style={{
        ...style,
        width: ukuran,
        height: ukuran,
        objectFit: "contain",
        flexShrink: 0,
      }}
      decoding="async"
    />
  );
}
