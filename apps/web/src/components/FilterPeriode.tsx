"use client";
import { tanggalIsoHariIni } from "@/lib/tanggal";
import {
  batasPeriode,
  type FilterPeriode as NilaiFilter,
  type ModePeriode,
} from "@/lib/filter-periode";
export default function FilterPeriode({
  nilai,
  onUbah,
}: {
  nilai: NilaiFilter;
  onUbah: (v: NilaiFilter) => void;
}) {
  let pesan = "";
  try {
    batasPeriode(nilai);
  } catch (e) {
    pesan = e instanceof Error ? e.message : "Periode tidak valid.";
  }
  return (
    <div className="filter-periode">
      <label>
        Periode
        <select
          value={nilai.mode}
          onChange={(e) => {
            const mode = e.target.value as ModePeriode;
            onUbah({
              mode,
              nilai:
                mode === "semua"
                  ? ""
                  : tanggalIsoHariIni().slice(
                      0,
                      mode === "tanggal" ? 10 : mode === "bulan" ? 7 : 4,
                    ),
            });
          }}
        >
          <option value="semua">Semua waktu</option>
          <option value="tanggal">Tanggal</option>
          <option value="bulan">Bulan</option>
          <option value="tahun">Tahun</option>
        </select>
      </label>
      {nilai.mode !== "semua" && (
        <label>
          {nilai.mode === "tanggal"
            ? "Pilih tanggal"
            : nilai.mode === "bulan"
              ? "Pilih bulan"
              : "Pilih tahun"}
          <input
            type={
              nilai.mode === "tanggal"
                ? "date"
                : nilai.mode === "bulan"
                  ? "month"
                  : "number"
            }
            min={nilai.mode === "tahun" ? 1900 : undefined}
            max={nilai.mode === "tahun" ? 2200 : undefined}
            value={nilai.nilai}
            onChange={(e) => onUbah({ ...nilai, nilai: e.target.value })}
          />
        </label>
      )}
      {pesan && (
        <p className="pesan-galat" role="status">
          {pesan}
        </p>
      )}
    </div>
  );
}
