import { bolehAksesModul } from "@/lib/akses";
import { DAFTAR_MODUL, type InfoModul } from "@/lib/modul";
import type { Peran } from "@/lib/peran";
import type { Santri } from "@/lib/data/santri";

const URUTAN = [
  "santri",
  "kehadiran",
  "hifzh",
  "diniyyah",
  "olahraga",
  "catatan",
  "laporan",
  "admin",
];

/** Satu urutan menu seperti mockup, tetap disaring dengan peta akses aplikasi. */
export function modulBeranda(peran: Peran | null): InfoModul[] {
  if (!peran) return [];
  return DAFTAR_MODUL.filter((m) => bolehAksesModul(peran, m.modul)).sort(
    (a, b) => URUTAN.indexOf(a.modul) - URUTAN.indexOf(b.modul),
  );
}

/** Hanya mencari pada daftar yang telah diberikan lapisan data berizin. */
export function cariDiBeranda(
  kata: string,
  modul: InfoModul[],
  santri: Santri[],
) {
  const q = kata.trim().toLocaleLowerCase("id-ID");
  if (!q) return { modul: [], santri: [] };
  return {
    modul: modul
      .filter((m) =>
        `${m.label} ${m.keterangan}`.toLocaleLowerCase("id-ID").includes(q),
      )
      .sort(
        (a, b) =>
          Number(b.label.toLocaleLowerCase("id-ID").includes(q)) -
          Number(a.label.toLocaleLowerCase("id-ID").includes(q)),
      ),
    santri: santri.filter((s) =>
      `${s.nama} ${s.namaAyahWali} ${s.kelasNama} ${s.nis ?? ""}`
        .toLocaleLowerCase("id-ID")
        .includes(q),
    ),
  };
}
