/**
 * Gaya sebaris (inline) khusus halaman Hifzh.
 *
 * Alasan: globals.css milik scaffold hanya menyediakan kelas dasar
 * (.kartu, .formulir, .tombol, dst.) dan belum mencakup tabel, lencana
 * nilai, serta kisi formulir 8 kolom. Gaya tambahan ditaruh di sini —
 * memakai variabel warna kop dari globals.css — sampai tahap integrasi
 * memutuskan memindahkannya ke globals.css.
 */
import type { CSSProperties } from "react";
import type { HasilUjian, NilaiSetoran } from "@/lib/hifzh";

export const gayaLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
};

export const gayaMasukan: CSSProperties = {
  minHeight: "var(--tinggi-sentuh)",
  padding: "10px 12px",
  fontSize: 15,
  border: "1px solid var(--garis)",
  borderRadius: 10,
  background: "var(--permukaan)",
  color: "var(--teks)",
  width: "100%",
};

export const gayaMasukanTerkunci: CSSProperties = {
  ...gayaMasukan,
  background: "var(--hijau-muda)",
  color: "var(--teks-redup)",
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
    background: nilai === "L" ? "var(--hijau-muda)" : "#fbe9e7",
    color: nilai === "L" ? "var(--hijau-gelap)" : "#8e2f24",
    border: `1px solid ${nilai === "L" ? "var(--hijau-kop)" : "#d08a80"}`,
  };
}

/** Lencana hasil ujian per juz, bertingkat dari M (terbaik) ke G. */
export function gayaLencanaHasil(hasil: HasilUjian): CSSProperties {
  const peta: Record<HasilUjian, { latar: string; teks: string; garis: string }> = {
    M: { latar: "var(--hijau-kop)", teks: "#ffffff", garis: "var(--hijau-kop)" },
    BS: { latar: "var(--hijau-muda)", teks: "var(--hijau-gelap)", garis: "var(--hijau-kop)" },
    B: { latar: "#eef4e6", teks: "#3d6212", garis: "var(--hijau-logo)" },
    C: { latar: "#fdf3d7", teks: "#7a5b00", garis: "var(--emas)" },
    K: { latar: "#fdeed3", teks: "#8a5312", garis: "#d9930d" },
    G: { latar: "#fbe9e7", teks: "#8e2f24", garis: "#d08a80" },
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

export const gayaPembungkusTabel: CSSProperties = {
  overflowX: "auto",
  margin: "0 -4px",
};

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
  fontSize: 13,
  whiteSpace: "nowrap",
};

export const gayaSel: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--garis)",
  verticalAlign: "top",
};
