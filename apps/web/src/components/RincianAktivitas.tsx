"use client";
import type { CSSProperties } from "react";
import { Ikon } from "@/components/Ikon";
import type { StatistikBeranda } from "@/components/BerandaMonitoring";
export default function RincianAktivitas({
  statistik,
  wali,
  memuat,
  galat,
  onMuatUlang,
}: {
  statistik: StatistikBeranda | null;
  wali: boolean;
  memuat: boolean;
  galat: boolean;
  onMuatUlang: () => void;
}) {
  const baris = [
    {
      label: wali ? "Setoran tercatat" : "Setoran hari ini",
      nilai: statistik?.setoran,
      warna: "#218a7b",
    },
    {
      label: wali ? "Kehadiran tercatat" : "Kehadiran hari ini",
      nilai: statistik?.kehadiran,
      warna: "#639bc1",
    },
    {
      label: wali ? "Catatan tercatat" : "Catatan hari ini",
      nilai: statistik?.catatan,
      warna: "#c3964b",
    },
  ];
  const tersedia =
    statistik !== null &&
    Object.values(statistik).every((n) => Number.isFinite(n) && n >= 0);
  const maks = tersedia
    ? Math.max(2, Math.ceil(Math.max(...baris.map((b) => b.nilai!)) / 2) * 2)
    : 1;
  const angka = (n: number) => n.toLocaleString("id-ID");
  return (
    <section
      className="beranda-aktivitas-terakhir aktivitas-panel"
      aria-labelledby="judul-rincian-aktivitas"
    >
      <div className="aktivitas-kepala">
        <div>
          <span className="aktivitas-kicker">MONITORING PONDOK</span>
          <h2 id="judul-rincian-aktivitas">Rincian aktivitas</h2>
        </div>
        <span className="aktivitas-periode">
          <Ikon nama="kalender" ukuran={14} />
          {wali ? "Catatan tersedia" : "Hari ini"}
        </span>
      </div>
      <p className="aktivitas-pengantar">
        {wali
          ? "Gambaran catatan perkembangan anak yang tertaut ke akun Anda."
          : "Lihat aktivitas belajar dan pendampingan dalam satu pandangan."}
      </p>
      {memuat ? (
        <div className="aktivitas-memuat" role="status">
          Memuat rincian aktivitas…
          <div aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
      ) : galat || !tersedia ? (
        <div className="beranda-galat" role="status">
          <span>Rincian belum dapat dimuat.</span>
          <button type="button" onClick={onMuatUlang}>
            Coba lagi
          </button>
        </div>
      ) : (
        <div className="aktivitas-layout">
          <dl className="aktivitas-sorotan">
            <div className="aktivitas-santri">
              <dt>
                <Ikon nama="santri" ukuran={23} />
                {wali ? "Anak tertaut" : "Santri aktif"}
              </dt>
              <dd>{angka(statistik.santri)}</dd>
              <span>
                {wali ? "Terhubung dengan akun Anda" : "Dalam data santri Anda"}
              </span>
            </div>
            {!wali && (
              <div className="aktivitas-olahraga">
                <dt>
                  <Ikon nama="olahraga" ukuran={18} />
                  Sesi olahraga pekan ini
                </dt>
                <dd>{angka(statistik.olahraga)}</dd>
              </div>
            )}
          </dl>
          <div className="aktivitas-grafik">
            <div className="aktivitas-grafik-judul">
              <strong>
                {wali ? "Catatan perkembangan" : "Catatan aktivitas harian"}
              </strong>
              <span>Jumlah catatan</span>
            </div>
            <dl
              className="aktivitas-batang"
              aria-label="Grafik jumlah catatan aktivitas"
            >
              {baris.map((b) => (
                <div
                  key={b.label}
                  style={{ "--warna-batang": b.warna } as CSSProperties}
                  tabIndex={0}
                  aria-label={`${b.label}: ${angka(b.nilai!)}`}
                >
                  <dt>{b.label}</dt>
                  <dd>{angka(b.nilai!)}</dd>
                  <div className="aktivitas-track" aria-hidden="true">
                    <span style={{ width: `${(b.nilai! / maks) * 100}%` }} />
                  </div>
                </div>
              ))}
            </dl>
            <div className="aktivitas-sumbu" aria-hidden="true">
              <span>0</span>
              <span>{angka(maks / 2)}</span>
              <span>{angka(maks)}</span>
            </div>
            {baris.every((b) => b.nilai === 0) && (
              <p className="aktivitas-nol">
                Belum ada aktivitas tercatat{wali ? "." : " hari ini."}
              </p>
            )}
            <p className="aktivitas-catatan">
              Berdasarkan catatan yang dimuat. Setiap batang menunjukkan
              jumlahnya sendiri{!wali && "; olahraga dihitung per pekan"}.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
