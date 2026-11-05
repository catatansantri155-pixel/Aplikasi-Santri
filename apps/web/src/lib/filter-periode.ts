export type ModePeriode = "semua" | "tanggal" | "bulan" | "tahun";
export interface FilterPeriode {
  mode: ModePeriode;
  nilai: string;
}
export const SEMUA_PERIODE: FilterPeriode = { mode: "semua", nilai: "" };
export function batasPeriode(
  filter: FilterPeriode,
): { mulai: string; selesai: string } | null {
  if (filter.mode === "semua") return null;
  const p = filter.nilai;
  if (filter.mode === "tahun" && !/^\d{4}$/.test(p))
    throw Error("Isi tahun dengan empat angka.");
  if (filter.mode === "bulan" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(p))
    throw Error("Pilih bulan dan tahun yang valid.");
  if (filter.mode === "tanggal" && !/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(p))
    throw Error("Pilih tanggal yang valid.");
  const tahun = Number(p.slice(0, 4));
  if (tahun < 1900 || tahun > 2200)
    throw Error("Tahun harus antara 1900 dan 2200.");
  const bulan = filter.mode === "tahun" ? 1 : Number(p.slice(5, 7));
  const hari = filter.mode === "tanggal" ? Number(p.slice(8, 10)) : 1;
  const d = new Date(Date.UTC(tahun, bulan - 1, hari));
  if (
    d.getUTCFullYear() !== tahun ||
    d.getUTCMonth() !== bulan - 1 ||
    d.getUTCDate() !== hari
  )
    throw Error("Tanggal tidak valid.");
  if (filter.mode === "tanggal") return { mulai: p, selesai: p };
  if (filter.mode === "tahun")
    return { mulai: `${p}-01-01`, selesai: `${p}-12-31` };
  const akhir = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  return { mulai: `${p}-01`, selesai: `${p}-${akhir}` };
}
export function cocokPeriode(tanggal: string, filter: FilterPeriode) {
  try {
    const b = batasPeriode(filter);
    return (
      !b ||
      (tanggal.slice(0, 10) >= b.mulai && tanggal.slice(0, 10) <= b.selesai)
    );
  } catch {
    return false;
  }
}
