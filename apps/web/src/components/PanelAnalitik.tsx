import type { ReactNode } from "react";
import { Ikon, type NamaIkon } from "@/components/Ikon";
import {
  BatangAnalitik,
  GarisAnalitik,
  DonatAnalitik,
  NilaiAnalitik,
  type TitikAnalitik,
} from "@/components/GrafikAnalitik";

export interface KomposisiAnalitik {
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  total: number;
}
export interface DataPanelAnalitik {
  hadir: TitikAnalitik[] | null;
  setoran: TitikAnalitik[] | null;
  olahraga: TitikAnalitik[] | null;
  nilai: { mapel: string; rata: number }[] | null;
  komposisi: KomposisiAnalitik | null;
  hasil: { l: number; u: number } | null;
}
export interface PropsPanelAnalitik {
  data: DataPanelAnalitik;
  galat: {
    hadir: string | null;
    setoran: string | null;
    olahraga: string | null;
    nilai: string | null;
    komposisi: string | null;
  };
  muatUlang: {
    hadir: () => void;
    setoran: () => void;
    olahraga: () => void;
    nilai: () => void;
    komposisi: () => void;
  };
  semester: { id: string; label: string }[];
  semesterId: string;
  onSemester: (id: string) => void;
}
const jumlah = (d: TitikAnalitik[] | null) =>
  d === null ? null : d.reduce((s, b) => s + b.nilai, 0);
const angka = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
function KartuAnalitik({
  judul,
  sub,
  kelas = "",
  galat,
  onUlang,
  children,
  aksi,
}: {
  judul: string;
  sub: string;
  kelas?: string;
  galat: string | null;
  onUlang: () => void;
  children: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <section className={`analitik-kartu ${kelas}`} aria-label={judul}>
      <div className="analitik-kartu-kepala">
        <div>
          <h2>{judul}</h2>
          <p>{sub}</p>
        </div>
        {aksi}
      </div>
      {galat ? (
        <div className="analitik-keadaan" role="status">
          <strong>Data belum berhasil dimuat</strong>
          <p>{galat}</p>
          <button type="button" onClick={onUlang}>
            Coba lagi
          </button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
function Keadaan({
  kosong = false,
  teks,
}: {
  kosong?: boolean;
  teks?: string;
}) {
  return (
    <div className="analitik-keadaan" role="status">
      <Ikon nama={kosong ? "rekap" : "kalender"} ukuran={24} />
      <p>
        {teks ?? (kosong ? "Belum ada data pada cakupan ini." : "Memuat data…")}
      </p>
    </div>
  );
}
function SatuPeriode({
  titik,
  satuan,
}: {
  titik: TitikAnalitik;
  satuan: string;
}) {
  return (
    <div className="analitik-satu-periode">
      <strong>
        {angka(titik.nilai)} <span>{satuan}</span>
      </strong>
      <p>{titik.label} · Tren tersedia setelah beberapa periode tercatat.</p>
    </div>
  );
}

export default function PanelAnalitik({
  data,
  galat,
  muatUlang,
  semester,
  semesterId,
  onSemester,
}: PropsPanelAnalitik) {
  const kpi: {
    label: string;
    nilai: number | null;
    cakupan: string;
    ikon: NamaIkon;
    utama?: boolean;
  }[] = [
    {
      label: "Catatan hadir",
      nilai: galat.hadir ? null : jumlah(data.hadir),
      cakupan: "8 pekan terakhir",
      ikon: "kehadiran",
      utama: true,
    },
    {
      label: "Setoran hifzh",
      nilai: galat.setoran ? null : jumlah(data.setoran),
      cakupan: "8 pekan terakhir",
      ikon: "hifzh",
    },
    {
      label: "Rata-rata mapel",
      nilai:
        galat.nilai || data.nilai === null || !data.nilai.length
          ? null
          : data.nilai.reduce((s, b) => s + b.rata, 0) / data.nilai.length,
      cakupan: "Gabungan harian & ujian",
      ikon: "diniyyah",
    },
    {
      label: "Sesi olahraga",
      nilai: galat.olahraga ? null : jumlah(data.olahraga),
      cakupan: "6 bulan terakhir",
      ikon: "olahraga",
    },
  ];
  const pilihan = semester.find((s) => s.id === semesterId);
  return (
    <div className="analitik-dashboard">
      <div className="analitik-pengantar">
        <div>
          <span className="analitik-eyebrow">PERKEMBANGAN SANTRI</span>
          <h2>Semua aktivitas, satu pandangan.</h2>
          <p>Angka mengikuti data yang dapat diakses akun Anda.</p>
        </div>
        <span className="analitik-tag">
          <Ikon nama="rekap" ukuran={15} />6 analitik
        </span>
      </div>
      <div className="analitik-kpi">
        {kpi.map((k) => (
          <div
            className={`analitik-kpi-item${k.utama ? " analitik-kpi-item--utama" : ""}`}
            key={k.label}
          >
            <span className="analitik-kpi-ikon">
              <Ikon nama={k.ikon} ukuran={18} />
            </span>
            <span className="analitik-kpi-label">{k.label}</span>
            <strong>{angka(k.nilai)}</strong>
            <small>{k.cakupan}</small>
          </div>
        ))}
      </div>
      <div className="analitik-kisi">
        <KartuAnalitik
          judul="Kehadiran per pekan"
          sub="Catatan hadir · 8 pekan terakhir"
          kelas="analitik-kartu--lebar"
          galat={galat.hadir}
          onUlang={muatUlang.hadir}
        >
          {data.hadir === null ? (
            <Keadaan />
          ) : !data.hadir.length ? (
            <Keadaan kosong />
          ) : data.hadir.length === 1 ? (
            <SatuPeriode titik={data.hadir[0]} satuan="catatan hadir" />
          ) : (
            <BatangAnalitik data={data.hadir} satuan="Catatan hadir" />
          )}
          <p className="analitik-catatan">
            Satu santri dapat tercatat pada beberapa sesi.
          </p>
        </KartuAnalitik>
        <KartuAnalitik
          judul="Komposisi kehadiran"
          sub={pilihan?.label ?? "Pilih semester untuk melihat komposisi"}
          kelas="analitik-kartu--samping"
          galat={galat.komposisi}
          onUlang={muatUlang.komposisi}
          aksi={
            <label className="analitik-filter">
              <span>Semester</span>
              <select
                value={semesterId}
                onChange={(e) => onSemester(e.target.value)}
                disabled={!semester.length}
              >
                {!semester.length && (
                  <option value="">Belum ada semester</option>
                )}
                {semester.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          {data.komposisi === null ? (
            <Keadaan kosong={semester.length === 0} />
          ) : data.komposisi.total > 0 ? (
            <DonatAnalitik
              label="catatan"
              bagian={[
                {
                  label: "Hadir",
                  nilai: data.komposisi.hadir,
                  warna: "#218a7b",
                },
                {
                  label: "Sakit",
                  nilai: data.komposisi.sakit,
                  warna: "#e9b850",
                },
                { label: "Izin", nilai: data.komposisi.izin, warna: "#6b94cc" },
                { label: "Alpa", nilai: data.komposisi.alpa, warna: "#d67871" },
              ]}
            />
          ) : (
            <Keadaan kosong />
          )}
        </KartuAnalitik>
        <KartuAnalitik
          judul="Progres setoran hifzh"
          sub="Jumlah setoran · 8 pekan terakhir"
          kelas="analitik-kartu--lebar"
          galat={galat.setoran}
          onUlang={muatUlang.setoran}
        >
          {data.setoran === null ? (
            <Keadaan />
          ) : !data.setoran.length ? (
            <Keadaan kosong />
          ) : data.setoran.length === 1 ? (
            <SatuPeriode titik={data.setoran[0]} satuan="setoran" />
          ) : (
            <GarisAnalitik data={data.setoran} />
          )}
        </KartuAnalitik>
        <KartuAnalitik
          judul="Hasil setoran"
          sub="Lancar dan ulang · Seluruh data yang dapat diakses"
          kelas="analitik-kartu--samping"
          galat={galat.setoran}
          onUlang={muatUlang.setoran}
        >
          {data.hasil === null ? (
            <Keadaan />
          ) : data.hasil.l + data.hasil.u > 0 ? (
            <DonatAnalitik
              label="setoran L/U"
              bagian={[
                { label: "Lancar", nilai: data.hasil.l, warna: "#218a7b" },
                { label: "Ulang", nilai: data.hasil.u, warna: "#e9b850" },
              ]}
            />
          ) : (
            <Keadaan kosong />
          )}
        </KartuAnalitik>
        <KartuAnalitik
          judul="Nilai diniyyah"
          sub="Rata-rata gabungan harian dan ujian per mata pelajaran"
          kelas="analitik-kartu--nilai"
          galat={galat.nilai}
          onUlang={muatUlang.nilai}
        >
          {data.nilai === null ? (
            <Keadaan />
          ) : data.nilai.length ? (
            <NilaiAnalitik data={data.nilai} />
          ) : (
            <Keadaan kosong />
          )}
        </KartuAnalitik>
        <KartuAnalitik
          judul="Aktivitas olahraga"
          sub="Sesi tercatat · 6 bulan terakhir"
          kelas="analitik-kartu--olahraga"
          galat={galat.olahraga}
          onUlang={muatUlang.olahraga}
        >
          {data.olahraga === null ? (
            <Keadaan />
          ) : !data.olahraga.length ? (
            <Keadaan kosong />
          ) : data.olahraga.length === 1 ? (
            <SatuPeriode titik={data.olahraga[0]} satuan="sesi olahraga" />
          ) : (
            <BatangAnalitik data={data.olahraga} satuan="Sesi olahraga" emas />
          )}
        </KartuAnalitik>
      </div>
    </div>
  );
}
