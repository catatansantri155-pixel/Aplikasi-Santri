/**
 * Gaya sebaris (inline) khusus halaman Hifzh.
 *
 * Token warna, lencana bersama, dan kelas komponen kini hidup di
 * globals.css (sistem desain). Berkas ini tinggal menampung gaya
 * tata letak spesifik modul (kisi formulir 8 kolom, tabel ujian)
 * yang merujuk token yang sama — radius masukan 14px, target sentuh
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
  border: "1.5px solid var(--masukan)",
  borderRadius: 14,
  background: "var(--permukaan)",
  color: "var(--teks)",
  width: "100%",
};

export const gayaMasukanTerkunci: CSSProperties = {
  ...gayaMasukan,
  border: "1.5px dashed var(--masukan)",
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

/** Lencana nilai setoran: L hijau (lancar), U merah bata (ulang).
 *  Gaya Lovable (port 4 Nov 2026): tanpa garis tepi, sudut 10px,
 *  tint lembut + teks nada status. */
export function gayaLencanaNilai(nilai: NilaiSetoran): CSSProperties {
  return {
    display: "inline-block",
    minWidth: 34,
    textAlign: "center",
    padding: "2px 10px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    background: nilai === "L" ? "#daf7e3" : "#ffe7e4",
    color: nilai === "L" ? "var(--status-hadir)" : "var(--status-alpa)",
  };
}

/** Lencana hasil ujian per juz, bertingkat dari M (terbaik) ke G.
 *  Gaya Lovable: M kini tint emas datar (bukan gradien emas penuh);
 *  tingkat lain memakai tint nada yang sama dengan lencana bersama. */
export function gayaLencanaHasil(hasil: HasilUjian): CSSProperties {
  const peta: Record<HasilUjian, { latar: string; teks: string }> = {
    M: { latar: "var(--emas-muda)", teks: "var(--emas-gelap)" },
    BS: { latar: "#daf7e3", teks: "var(--status-hadir)" },
    B: { latar: "#edf5df", teks: "#4a6b12" },
    C: { latar: "#ffecc9", teks: "var(--status-sakit)" },
    K: { latar: "#fdebd8", teks: "#8a4a0b" },
    G: { latar: "#ffe7e4", teks: "var(--status-alpa)" },
  };
  const warna = peta[hasil];
  return {
    display: "inline-block",
    minWidth: 40,
    textAlign: "center",
    padding: "2px 10px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    background: warna.latar,
    color: warna.teks,
  };
}

/* Tabel MUAT lebar layar (tanpa minWidth & tanpa gulir horizontal —
   syarat keras arah UI UNPIX); sel dirampingkan dan kepala kolom
   boleh membungkus agar 7 kolom juz muat di layar sempit. */
export const gayaTabel: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

export const gayaSelKepala: CSSProperties = {
  textAlign: "left",
  padding: "7px 6px",
  borderBottom: "2px solid var(--garis)",
  color: "var(--teks-redup)",
  fontSize: 12,
  fontWeight: 600,
};

export const gayaSel: CSSProperties = {
  padding: "7px 6px",
  borderBottom: "1px solid var(--garis)",
  verticalAlign: "top",
};
