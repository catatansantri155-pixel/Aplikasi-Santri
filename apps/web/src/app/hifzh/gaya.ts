/**
 * Gaya sebaris (inline) khusus halaman Hifzh.
 *
 * Token warna, lencana bersama, dan kelas komponen kini hidup di
 * globals.css (sistem desain). Berkas ini tinggal menampung gaya
 * tata letak spesifik modul (kisi formulir 8 kolom, tabel ujian)
 * yang merujuk token yang sama — radius masukan 12px, target sentuh
 * 48px, dan palet hasil M (emas) → G (merah) selaras panduan.
 */
import type { CSSProperties } from "react";
import type { HasilUjian, NilaiSetoran } from "@/lib/hifzh";

export const gayaLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
};

export const gayaMasukan: CSSProperties = {
  minHeight: 48,
  padding: "11px 14px",
  fontSize: 15,
  border: "1.5px solid var(--garis)",
  borderRadius: 12,
  background: "var(--permukaan)",
  color: "var(--teks)",
  width: "100%",
};

export const gayaMasukanTerkunci: CSSProperties = {
  ...gayaMasukan,
  border: "1.5px dashed #bfd4c6",
  background: "var(--hijau-muda)",
  color: "var(--hijau-gelap)",
  fontWeight: 700,
};

export const gayaKisiDua: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "1fr 1fr",
};

export const gayaKisiTiga: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "1fr 1fr 1fr",
};

export const gayaFormulirLebar: CSSProperties = {
  display: "grid",
  gap: 12,
  maxWidth: 560,
};

export const gayaPetunjuk: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "var(--teks-redup)",
  fontWeight: 400,
};

/** Lencana nilai setoran: L hijau (lancar), U merah bata (ulang). */
export function gayaLencanaNilai(nilai: NilaiSetoran): CSSProperties {
  return {
    display: "inline-block",
    minWidth: 34,
    textAlign: "center",
    padding: "2px 10px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 13,
    background: nilai === "L" ? "#e2f4ea" : "#fbe3e1",
    color: nilai === "L" ? "var(--hijau-gelap)" : "#9c2b25",
    border: `1px solid ${nilai === "L" ? "var(--status-hadir)" : "#e5a09a"}`,
  };
}

/** Lencana hasil ujian per juz, bertingkat dari M (terbaik) ke G. */
export function gayaLencanaHasil(hasil: HasilUjian): CSSProperties {
  const peta: Record<HasilUjian, { latar: string; teks: string; garis: string }> = {
    // M = Mutqin: EMAS penuh sesuai panduan (sebelumnya hijau).
    M: { latar: "linear-gradient(135deg, #f5c33b, var(--emas))", teks: "#2a1e00", garis: "#d99a00" },
    BS: { latar: "#dff2e4", teks: "#0e6b3c", garis: "var(--status-hadir)" },
    B: { latar: "#edf5df", teks: "#4a6b12", garis: "var(--hasil-b)" },
    C: { latar: "#fcf0d3", teks: "#8a6100", garis: "var(--hasil-c)" },
    K: { latar: "#fdebd8", teks: "#8a4a0b", garis: "var(--hasil-k)" },
    G: { latar: "#fbe3e1", teks: "#9c2b25", garis: "var(--hasil-g)" },
  };
  const warna = peta[hasil];
  return {
    display: "inline-block",
    minWidth: 40,
    textAlign: "center",
    padding: "2px 10px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 13,
    background: warna.latar,
    color: warna.teks,
    border: `1px solid ${warna.garis}`,
  };
}

export const gayaTabel: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  minWidth: 520,
};

export const gayaSelKepala: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid var(--garis)",
  color: "var(--teks-redup)",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

export const gayaSel: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--garis)",
  verticalAlign: "top",
};
