import { batasPeriode } from "@/lib/filter-periode";
export const JENIS_AGENDA = {
  akademik: "Akademik",
  kegiatan: "Kegiatan",
  libur: "Libur",
  kunjungan: "Kunjungan",
  lainnya: "Lainnya",
};
export const STATUS_SEHAT = {
  dipantau: "Dalam pemantauan",
  dirujuk: "Dirujuk",
  pulih: "Pulih",
};
export function batasBulan(bulan: string) {
  const b = batasPeriode({ mode: "bulan", nilai: bulan })!;
  const akhir = new Date(b.selesai + "T00:00:00+07:00");
  akhir.setUTCDate(akhir.getUTCDate() + 1);
  return {
    mulai: new Date(b.mulai + "T00:00:00+07:00").toISOString(),
    selesai: akhir.toISOString(),
  };
}
export function geserBulan(bulan: string, n: number) {
  batasBulan(bulan);
  const d = new Date(bulan + "-15T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}
export function hariKalender(bulan: string) {
  batasBulan(bulan);
  const awal = new Date(bulan + "-01T12:00:00Z"),
    mundur = (awal.getUTCDay() + 6) % 7;
  awal.setUTCDate(1 - mundur);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(awal);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
export function agendaPadaHari(
  a: { mulai: string; selesai: string },
  hari: string,
) {
  const b = new Date(hari + "T00:00:00+07:00").getTime();
  return Date.parse(a.mulai) < b + 86400000 && Date.parse(a.selesai) > b;
}
export function validasiAgenda(d: {
  judul: string;
  mulai: string;
  selesai: string;
  jenis: string;
  deskripsi: string;
  lokasi: string;
}) {
  if (d.judul.trim().length < 3 || d.judul.trim().length > 160)
    throw Error("Judul harus 3–160 karakter.");
  if (!Object.hasOwn(JENIS_AGENDA, d.jenis)) throw Error("Pilih jenis agenda.");
  if (
    !Number.isFinite(Date.parse(d.mulai)) ||
    !Number.isFinite(Date.parse(d.selesai)) ||
    Date.parse(d.selesai) <= Date.parse(d.mulai)
  )
    throw Error("Waktu selesai harus setelah mulai.");
  if (d.deskripsi.length > 4000 || d.lokasi.length > 200)
    throw Error("Deskripsi maksimal 4.000 dan lokasi 200 karakter.");
}
export function validasiKesehatan(
  d: {
    santri_id: string;
    tanggal: string;
    keluhan: string;
    tindakan: string;
    rujukan: string;
    status: string;
  },
  hariIni: string,
) {
  if (!d.santri_id) throw Error("Pilih santri.");
  batasPeriode({ mode: "tanggal", nilai: d.tanggal });
  if (d.tanggal > hariIni) throw Error("Tanggal tidak boleh di masa depan.");
  if (
    d.keluhan.trim().length < 5 ||
    d.keluhan.length > 2000 ||
    d.tindakan.length > 2000 ||
    d.rujukan.length > 300
  )
    throw Error(
      "Keluhan 5–2.000, penanganan maksimal 2.000 dan rujukan 300 karakter.",
    );
  if (!Object.hasOwn(STATUS_SEHAT, d.status))
    throw Error("Pilih status kesehatan.");
}
