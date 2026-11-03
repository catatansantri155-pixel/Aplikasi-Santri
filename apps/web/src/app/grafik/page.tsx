"use client";

/**
 * Halaman Grafik — revisi biru 3 Nov 2026 (slot ke-4 navigasi bawah,
 * menggantikan Menu; halaman /menu sendiri tetap ada).
 *
 * Enam grafik dengan GAYA BERBEDA, semuanya dihitung dari fungsi
 * lapisan data yang SUDAH ADA — halaman ini tidak mengarang data:
 *  a. Batang vertikal polos — jumlah Hadir per pekan
 *     (lib/data/rekap.ts: ambilRekapPekanan, dijumlah per pekan).
 *  b. Donat SVG — komposisi status kehadiran semester H/S/I/A
 *     (ambilRekapSemester, dijumlah lintas santri).
 *  c. Garis/area SVG — progres jumlah setoran hifzh per pekan
 *     (ambilAgregatGrafikHifzh, agregat mingguan per jenis dijumlah).
 *  d. Batang horizontal — rata-rata gabungan nilai diniyyah per
 *     mapel (ambilNilaiHarianSantri + ambilNilaiUjianSantri per
 *     santri yang bisa diakses peran ini, diringkas dengan
 *     hitungRingkasanMapel lalu dirata-rata lintas santri).
 *  e. Batang bertumpuk proporsi — hasil setoran Lancar vs Ulang
 *     (dari agregat hifzh yang sama dengan c).
 *  f. Batang vertikal bulat bergradasi — jumlah sesi olahraga per
 *     bulan (lib/data/olahraga.ts: ambilDaftarSesi, dikelompokkan
 *     per bulan tanggal sesi).
 *
 * Semua fungsi sumber menghormati RLS: staf melihat agregat semua
 * santri, wali hanya agregat anaknya sendiri. Keadaan kosong selalu
 * ditampilkan sebagai pesan "Belum ada data." — bukan angka karangan.
 * Boleh dibuka semua peran yang login (modul "grafik" di
 * src/lib/akses.ts = semua peran).
 *
 * Perbaikan audit Fase 1 (3 Nov 2026):
 * - Donat komposisi kehadiran memakai PILIHAN SEMESTER (bawaan:
 *   semester yang sedang berjalan menurut tanggal hari ini), tidak
 *   lagi menjumlahkan semua semester sekaligus.
 * - Di bawah tiap judul ada label cakupan data yang sedang dibaca.
 * - Galat ≠ kosong: setiap grafik dimuat mandiri; kegagalannya
 *   menampilkan KartuGalat "Gagal memuat data" dengan tombol coba
 *   lagi khusus grafik itu, BUKAN tulisan "Belum ada data".
 * - Label grafik pertama diperjelas: yang dihitung adalah catatan
 *   hadir per pekan, bukan jumlah santri unik.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import PenandaTahap from "@/components/PenandaTahap";
import PenjagaModul from "@/components/PenjagaModul";
import KartuGalat from "@/components/KartuGalat";
import {
  ambilAgregatGrafikHifzh,
  ambilRekapPekanan,
  ambilRekapSemester,
  type BarisRekapSemester,
} from "@/lib/data/rekap";
import { ambilDaftarSantri } from "@/lib/data/santri";
import {
  ambilNilaiHarianSantri,
  ambilNilaiUjianSantri,
  ambilSemester,
  formatNilai,
  hitungRingkasanMapel,
  type SemesterRef,
} from "@/lib/data/diniyyah";
import { ambilDaftarSesi } from "@/lib/data/olahraga";

/* ------------------------------------------------------------------ */
/* Tipe & pembantu                                                    */
/* ------------------------------------------------------------------ */

interface TitikBatang {
  label: string;
  nilai: number;
}

interface KomposisiStatus {
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  total: number;
}

function formatTanggalSingkat(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function labelBulanSingkat(isoAwalBulan: string): string {
  return new Date(`${isoAwalBulan}T00:00:00`).toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });
}

function formatPersen(n: number): string {
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

function BelumAdaData() {
  return <p style={{ margin: 0 }}>Belum ada data.</p>;
}

/* ------------------------------------------------------------------ */
/* a & f — Batang vertikal (dua gaya: polos dan bulat bergradasi)     */
/* ------------------------------------------------------------------ */

function GrafikBatangVertikal({
  data,
  gaya,
  satuan,
}: {
  data: TitikBatang[];
  gaya: "polos" | "bulat";
  satuan: string;
}) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }} role="img"
        aria-label={data
          .map((d) => `${d.label}: ${d.nilai} ${satuan}`)
          .join(", ")}
      >
        {data.map((d) => (
          <div
            key={d.label}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, lineHeight: "18px" }}>
              {d.nilai}
            </span>
            <div
              style={{
                height: 120,
                width: "100%",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 46,
                  height: `${Math.max(0, (d.nilai / maks) * 100)}%`,
                  minHeight: d.nilai > 0 ? 5 : 0,
                  background:
                    gaya === "bulat"
                      ? "linear-gradient(180deg, #42a5f5, #1565c0)"
                      : "#1565c0",
                  borderRadius:
                    gaya === "bulat" ? "999px 999px 4px 4px" : "4px 4px 0 0",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        {data.map((d) => (
          <span
            key={d.label}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              fontSize: 11,
              color: "var(--teks-redup)",
              overflowWrap: "break-word",
            }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* b — Donat SVG komposisi status kehadiran                           */
/* ------------------------------------------------------------------ */

const BAGIAN_STATUS: {
  kunci: keyof Omit<KomposisiStatus, "total">;
  label: string;
  warna: string;
}[] = [
  { kunci: "hadir", label: "Hadir", warna: "var(--status-hadir)" },
  { kunci: "sakit", label: "Sakit", warna: "var(--status-sakit)" },
  { kunci: "izin", label: "Izin", warna: "var(--status-izin)" },
  { kunci: "alpa", label: "Alpa", warna: "var(--status-alpa)" },
];

function GrafikDonat({ komposisi }: { komposisi: KomposisiStatus }) {
  const R = 54;
  const KELILING = 2 * Math.PI * R;
  let awal = 0;
  const segmen = BAGIAN_STATUS.map((b) => {
    const nilai = komposisi[b.kunci];
    const panjang = komposisi.total > 0 ? (nilai / komposisi.total) * KELILING : 0;
    const s = { ...b, nilai, panjang, geser: awal };
    awal += panjang;
    return s;
  });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg
          width="168"
          height="168"
          viewBox="0 0 140 140"
          role="img"
          aria-label={segmen
            .map(
              (s) =>
                `${s.label} ${s.nilai} (${formatPersen(
                  komposisi.total > 0 ? (s.nilai / komposisi.total) * 100 : 0,
                )})`,
            )
            .join(", ")}
        >
          <circle
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke="var(--hijau-muda)"
            strokeWidth="24"
          />
          {segmen
            .filter((s) => s.nilai > 0)
            .map((s) => (
              <circle
                key={s.kunci}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={s.warna}
                strokeWidth="24"
                strokeDasharray={`${Math.max(0, s.panjang - 1.5)} ${KELILING}`}
                strokeDashoffset={-s.geser}
                transform="rotate(-90 70 70)"
              />
            ))}
          <text
            x="70"
            y="66"
            textAnchor="middle"
            fontSize="21"
            fontWeight="800"
            fill="var(--teks)"
          >
            {komposisi.total}
          </text>
          <text
            x="70"
            y="84"
            textAnchor="middle"
            fontSize="11"
            fill="var(--teks-redup)"
          >
            sesi tercatat
          </text>
        </svg>
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: "10px 0 0",
          padding: 0,
          display: "grid",
          gap: 6,
        }}
      >
        {segmen.map((s) => (
          <li
            key={s.kunci}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: s.warna,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1 }}>{s.label}</span>
            <strong>{s.nilai}</strong>
            <span style={{ color: "var(--teks-redup)", minWidth: 52, textAlign: "right" }}>
              {formatPersen(
                komposisi.total > 0 ? (s.nilai / komposisi.total) * 100 : 0,
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* c — Garis/area SVG progres setoran hifzh                           */
/* ------------------------------------------------------------------ */

function GrafikGaris({ data }: { data: TitikBatang[] }) {
  const LEBAR = 320;
  const TINGGI = 150;
  const PAD_X = 14;
  const PAD_ATAS = 22;
  const PAD_BAWAH = 8;
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  const titik = data.map((d, i) => ({
    ...d,
    x:
      data.length === 1
        ? LEBAR / 2
        : PAD_X + (i * (LEBAR - 2 * PAD_X)) / (data.length - 1),
    y:
      TINGGI -
      PAD_BAWAH -
      (d.nilai / maks) * (TINGGI - PAD_ATAS - PAD_BAWAH),
  }));
  const garis = titik.map((t) => `${t.x},${t.y}`).join(" ");
  const area =
    titik.length > 0
      ? `M ${titik[0].x} ${TINGGI - PAD_BAWAH} L ${titik
          .map((t) => `${t.x} ${t.y}`)
          .join(" L ")} L ${titik[titik.length - 1].x} ${TINGGI - PAD_BAWAH} Z`
      : "";
  return (
    <div>
      <svg
        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={data
          .map((d) => `${d.label}: ${d.nilai} setoran`)
          .join(", ")}
      >
        {area && <path d={area} fill="rgba(21, 101, 192, 0.14)" />}
        <polyline
          points={garis}
          fill="none"
          stroke="#1565c0"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {titik.map((t) => (
          <g key={t.label}>
            <circle cx={t.x} cy={t.y} r="4" fill="#1565c0" stroke="#fff" strokeWidth="1.5" />
            <text
              x={t.x}
              y={Math.max(11, t.y - 9)}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="700"
              fill="var(--teks)"
            >
              {t.nilai}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", marginTop: 4 }}>
        {data.map((d) => (
          <span
            key={d.label}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              fontSize: 11,
              color: "var(--teks-redup)",
              overflowWrap: "break-word",
            }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* d — Batang horizontal rata-rata nilai diniyyah per mapel           */
/* ------------------------------------------------------------------ */

function GrafikBatangHorizontal({
  data,
}: {
  data: { mapel: string; rata: number }[];
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {data.map((d) => (
        <div
          key={d.mapel}
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <span
            style={{
              width: 84,
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 600,
              overflowWrap: "break-word",
            }}
          >
            {d.mapel}
          </span>
          <div
            role="img"
            aria-label={`${d.mapel}: rata-rata ${formatNilai(d.rata)} dari 100`}
            style={{
              flex: 1,
              minWidth: 0,
              height: 16,
              borderRadius: 999,
              background: "var(--hijau-muda)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, d.rata))}%`,
                height: "100%",
                borderRadius: 999,
                background: "var(--biru-buku)",
              }}
            />
          </div>
          <strong style={{ minWidth: 38, textAlign: "right", fontSize: 13 }}>
            {formatNilai(d.rata)}
          </strong>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* e — Batang bertumpuk proporsi Lancar vs Ulang                      */
/* ------------------------------------------------------------------ */

function GrafikProporsiLU({ l, u }: { l: number; u: number }) {
  const total = l + u;
  const persenL = total > 0 ? (l / total) * 100 : 0;
  return (
    <div>
      <div
        role="img"
        aria-label={`Lancar ${l}, Ulang ${u}`}
        style={{
          display: "flex",
          height: 20,
          borderRadius: 10,
          overflow: "hidden",
          background: "#fbe9e7",
        }}
      >
        <div
          style={{ width: `${persenL}%`, background: "var(--status-hadir)" }}
        />
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--teks-redup)" }}>
        Lancar {l} · Ulang {u} ({formatPersen(Math.round(persenL * 10) / 10)}{" "}
        Lancar)
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Halaman                                                            */
/* ------------------------------------------------------------------ */

export default function HalamanGrafik() {
  return (
    <PenjagaModul modul="grafik">
      <IsiGrafik />
    </PenjagaModul>
  );
}

/** Label cakupan singkat di bawah judul grafik (audit Fase 1). */
function LabelCakupan({ teks }: { teks: string }) {
  return (
    <p className="catatan-kaki" style={{ marginTop: 0 }}>
      Cakupan: {teks}
    </p>
  );
}

const CAKUPAN_SEMUA = "semua data yang dapat Anda akses";

function tanggalHariIniIso(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

interface OpsiSemester {
  id: string;
  label: string;
}

function IsiGrafik() {
  // a. Kehadiran per pekan
  const [hadirPerPekan, setHadirPerPekan] = useState<TitikBatang[] | null>(
    null,
  );
  const [galatPekanan, setGalatPekanan] = useState<string | null>(null);

  // b. Donat komposisi per semester terpilih
  const [barisSemester, setBarisSemester] = useState<
    BarisRekapSemester[] | null
  >(null);
  const [daftarSemester, setDaftarSemester] = useState<SemesterRef[]>([]);
  const [semesterId, setSemesterId] = useState<string>("");
  const [galatDonat, setGalatDonat] = useState<string | null>(null);

  // c + e. Agregat hifzh (progres mingguan & proporsi L/U)
  const [progresHifzh, setProgresHifzh] = useState<TitikBatang[] | null>(null);
  const [proporsiLU, setProporsiLU] = useState<{ l: number; u: number } | null>(
    null,
  );
  const [galatHifzh, setGalatHifzh] = useState<string | null>(null);

  // d. Rata-rata diniyyah per mapel
  const [rataMapel, setRataMapel] = useState<
    { mapel: string; rata: number }[] | null
  >(null);
  const [galatDiniyyah, setGalatDiniyyah] = useState<string | null>(null);

  // f. Sesi olahraga per bulan
  const [sesiPerBulan, setSesiPerBulan] = useState<TitikBatang[] | null>(null);
  const [galatOlahraga, setGalatOlahraga] = useState<string | null>(null);

  const [sumberContoh, setSumberContoh] = useState(false);
  const tandaiContoh = useCallback((b: boolean) => {
    if (b) setSumberContoh(true);
  }, []);

  /* ---- a. Hadir per pekan: jumlahkan catatan hadir lintas santri,
         8 pekan terakhir. ---- */
  const muatPekanan = useCallback(async () => {
    setGalatPekanan(null);
    try {
      const pekanan = await ambilRekapPekanan();
      tandaiContoh(pekanan.sumberContoh);
      const perPekan = new Map<string, number>();
      for (const b of pekanan.data) {
        perPekan.set(
          b.pekanMulai,
          (perPekan.get(b.pekanMulai) ?? 0) + b.jumlahHadir,
        );
      }
      setHadirPerPekan(
        [...perPekan.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-8)
          .map(([pekanMulai, nilai]) => ({
            label: formatTanggalSingkat(pekanMulai),
            nilai,
          })),
      );
    } catch (e: unknown) {
      setGalatPekanan(
        e instanceof Error ? e.message : "Gagal memuat data kehadiran.",
      );
    }
  }, [tandaiContoh]);

  /* ---- b. Donat: daftar semester + baris rekap semester; donat
         hanya menjumlahkan baris pada semester terpilih. ---- */
  const muatDonat = useCallback(async () => {
    setGalatDonat(null);
    try {
      const [semesterHasil, semesteran] = await Promise.all([
        ambilSemester(),
        ambilRekapSemester(),
      ]);
      tandaiContoh(semesterHasil.sumberContoh || semesteran.sumberContoh);
      setDaftarSemester(semesterHasil.data);
      setBarisSemester(semesteran.data);
      // Bawaan pilihan: semester yang sedang berjalan menurut tanggal
      // hari ini; cadangan: semester pertama pada daftar pilihan.
      setSemesterId((lama) => {
        if (lama) return lama;
        const opsi = opsiSemesterDari(semesterHasil.data, semesteran.data);
        const hariIni = tanggalHariIniIso();
        const berjalan = semesterHasil.data.find(
          (s) =>
            s.tanggalMulai &&
            s.tanggalSelesai &&
            hariIni >= s.tanggalMulai &&
            hariIni <= s.tanggalSelesai,
        );
        return berjalan?.id ?? opsi[0]?.id ?? "";
      });
    } catch (e: unknown) {
      setGalatDonat(
        e instanceof Error ? e.message : "Gagal memuat data semester.",
      );
    }
  }, [tandaiContoh]);

  /* ---- c + e. Progres setoran per pekan & proporsi L vs U dari
         agregat hifzh yang sama. ---- */
  const muatHifzh = useCallback(async () => {
    setGalatHifzh(null);
    try {
      const agregat = await ambilAgregatGrafikHifzh();
      tandaiContoh(agregat.sumberContoh);
      const perPeriode = new Map<string, number>();
      let totalL = 0;
      let totalU = 0;
      for (const b of agregat.data.mingguan) {
        perPeriode.set(
          b.periodeMulai,
          (perPeriode.get(b.periodeMulai) ?? 0) + b.jumlahSetoran,
        );
        totalL += b.jumlahL;
        totalU += b.jumlahU;
      }
      setProgresHifzh(
        [...perPeriode.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-8)
          .map(([periodeMulai, nilai]) => ({
            label: formatTanggalSingkat(periodeMulai),
            nilai,
          })),
      );
      setProporsiLU({ l: totalL, u: totalU });
    } catch (e: unknown) {
      setGalatHifzh(
        e instanceof Error ? e.message : "Gagal memuat data hifzh.",
      );
    }
  }, [tandaiContoh]);

  /* ---- d. Rata-rata nilai diniyyah per mapel: per santri yang bisa
         diakses peran ini (RLS), diringkas lalu dirata-rata. ---- */
  const muatDiniyyah = useCallback(async () => {
    setGalatDiniyyah(null);
    try {
      const daftar = await ambilDaftarSantri();
      tandaiContoh(daftar.sumberContoh);
      const perMapel = new Map<string, number[]>();
      await Promise.all(
        daftar.data.map(async (s) => {
          const [harian, ujian] = await Promise.all([
            ambilNilaiHarianSantri(s.id),
            ambilNilaiUjianSantri(s.id),
          ]);
          tandaiContoh(harian.sumberContoh || ujian.sumberContoh);
          for (const r of hitungRingkasanMapel(harian.data, ujian.data)) {
            if (r.rataGabungan === null) continue;
            const ada = perMapel.get(r.mapel) ?? [];
            ada.push(r.rataGabungan);
            perMapel.set(r.mapel, ada);
          }
        }),
      );
      setRataMapel(
        [...perMapel.entries()]
          .map(([mapel, nilai]) => ({
            mapel,
            rata:
              Math.round(
                (nilai.reduce((a, b) => a + b, 0) / nilai.length) * 10,
              ) / 10,
          }))
          .sort((a, b) => b.rata - a.rata),
      );
    } catch (e: unknown) {
      setGalatDiniyyah(
        e instanceof Error ? e.message : "Gagal memuat data diniyyah.",
      );
    }
  }, [tandaiContoh]);

  /* ---- f. Sesi olahraga per bulan: kelompokkan tanggal sesi. ---- */
  const muatOlahraga = useCallback(async () => {
    setGalatOlahraga(null);
    try {
      const sesi = await ambilDaftarSesi();
      tandaiContoh(sesi.sumberContoh);
      const perBulan = new Map<string, number>();
      for (const s of sesi.data) {
        const bulan = s.tanggal.slice(0, 7);
        perBulan.set(bulan, (perBulan.get(bulan) ?? 0) + 1);
      }
      setSesiPerBulan(
        [...perBulan.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6)
          .map(([bulan, nilai]) => ({
            label: labelBulanSingkat(`${bulan}-01`),
            nilai,
          })),
      );
    } catch (e: unknown) {
      setGalatOlahraga(
        e instanceof Error ? e.message : "Gagal memuat data olahraga.",
      );
    }
  }, [tandaiContoh]);

  useEffect(() => {
    void muatPekanan();
    void muatDonat();
    void muatHifzh();
    void muatDiniyyah();
    void muatOlahraga();
  }, [muatPekanan, muatDonat, muatHifzh, muatDiniyyah, muatOlahraga]);

  /* Pilihan semester untuk donat: dari daftar semester resmi; bila
     daftar itu kosong, turunkan dari baris rekap yang ada. */
  const opsiSemester = opsiSemesterDari(daftarSemester, barisSemester ?? []);
  const semesterTerpilih =
    opsiSemester.find((o) => o.id === semesterId) ?? opsiSemester[0];

  /* Komposisi donat: HANYA baris pada semester terpilih. */
  const komposisi: KomposisiStatus | null = useMemo(() => {
    if (!barisSemester || !semesterTerpilih) return null;
    const komp: KomposisiStatus = {
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
      total: 0,
    };
    for (const b of barisSemester) {
      if (b.semesterId !== semesterTerpilih.id) continue;
      komp.hadir += b.jumlahHadir;
      komp.sakit += b.jumlahSakit;
      komp.izin += b.jumlahIzin;
      komp.alpa += b.jumlahAlpa;
      komp.total += b.totalSesi;
    }
    return komp;
  }, [barisSemester, semesterTerpilih]);

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">Grafik</h1>
      <p className="subjudul">
        Enam grafik ringkasan dari data kehadiran, hifzh, diniyyah, dan
        olahraga yang bisa Anda akses.
      </p>

      {/* ------------ a. Kehadiran per pekan ------------ */}
      {galatPekanan ? (
        <KartuGalat
          pesan={`Gagal memuat data grafik "Kehadiran per pekan": ${galatPekanan}`}
          onCobaLagi={() => void muatPekanan()}
        />
      ) : (
        <section className="kartu">
          <h2>Kehadiran per pekan</h2>
          <LabelCakupan teks={CAKUPAN_SEMUA} />
          <p className="catatan-kaki" style={{ marginTop: 0 }}>
            Jumlah catatan hadir per pekan (satu santri dapat terhitung
            di beberapa sesi). 8 pekan terakhir.
          </p>
          {hadirPerPekan === null ? (
            <p className="catatan-kaki">Memuat grafik…</p>
          ) : hadirPerPekan.length > 0 ? (
            <GrafikBatangVertikal
              data={hadirPerPekan}
              gaya="polos"
              satuan="catatan hadir"
            />
          ) : (
            <BelumAdaData />
          )}
        </section>
      )}

      {/* ------------ b. Komposisi kehadiran semester ------------ */}
      {galatDonat ? (
        <KartuGalat
          pesan={`Gagal memuat data grafik "Komposisi kehadiran semester": ${galatDonat}`}
          onCobaLagi={() => void muatDonat()}
        />
      ) : (
        <section className="kartu">
          <h2>Komposisi kehadiran semester</h2>
          <LabelCakupan
            teks={
              semesterTerpilih
                ? semesterTerpilih.label
                : "semester belum dipilih"
            }
          />
          <div className="formulir" style={{ maxWidth: "100%" }}>
            <label>
              Semester
              <select
                className="masukan"
                value={semesterTerpilih?.id ?? ""}
                onChange={(e) => setSemesterId(e.target.value)}
                disabled={opsiSemester.length === 0}
              >
                {opsiSemester.length === 0 && (
                  <option value="">Belum ada semester</option>
                )}
                {opsiSemester.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="catatan-kaki">
            Persentase status Hadir, Sakit, Izin, dan Alpa dari sesi
            pada semester terpilih.
          </p>
          {barisSemester === null ? (
            <p className="catatan-kaki">Memuat grafik…</p>
          ) : komposisi && komposisi.total > 0 ? (
            <GrafikDonat komposisi={komposisi} />
          ) : (
            <BelumAdaData />
          )}
        </section>
      )}

      {/* ------------ c. Progres setoran hifzh ------------ */}
      {galatHifzh ? (
        <KartuGalat
          pesan={`Gagal memuat data grafik hifzh: ${galatHifzh}`}
          onCobaLagi={() => void muatHifzh()}
        />
      ) : (
        <>
          <section className="kartu">
            <h2>Progres setoran hifzh</h2>
            <LabelCakupan teks={CAKUPAN_SEMUA} />
            <p className="catatan-kaki" style={{ marginTop: 0 }}>
              Jumlah setoran Buku Hafalan per pekan (8 pekan terakhir).
            </p>
            {progresHifzh === null ? (
              <p className="catatan-kaki">Memuat grafik…</p>
            ) : progresHifzh.length > 0 ? (
              <GrafikGaris data={progresHifzh} />
            ) : (
              <BelumAdaData />
            )}
          </section>

          {/* ------------ e. Hasil setoran L vs U ------------ */}
          <section className="kartu">
            <h2>Hasil setoran: Lancar vs Ulang</h2>
            <LabelCakupan teks={CAKUPAN_SEMUA} />
            <p className="catatan-kaki" style={{ marginTop: 0 }}>
              Proporsi nilai L (Lancar) berbanding U (Ulang) dari semua
              setoran hifzh yang tercatat.
            </p>
            {proporsiLU === null ? (
              <p className="catatan-kaki">Memuat grafik…</p>
            ) : proporsiLU.l + proporsiLU.u > 0 ? (
              <GrafikProporsiLU l={proporsiLU.l} u={proporsiLU.u} />
            ) : (
              <BelumAdaData />
            )}
          </section>
        </>
      )}

      {/* ------------ d. Rata-rata nilai diniyyah per mapel ------------ */}
      {galatDiniyyah ? (
        <KartuGalat
          pesan={`Gagal memuat data grafik "Rata-rata nilai diniyyah per mapel": ${galatDiniyyah}`}
          onCobaLagi={() => void muatDiniyyah()}
        />
      ) : (
        <section className="kartu">
          <h2>Rata-rata nilai diniyyah per mapel</h2>
          <LabelCakupan teks={CAKUPAN_SEMUA} />
          <p className="catatan-kaki" style={{ marginTop: 0 }}>
            Rata-rata gabungan nilai harian dan ujian tiap mata
            pelajaran, dirata-rata dari santri yang bisa Anda akses.
          </p>
          {rataMapel === null ? (
            <p className="catatan-kaki">Memuat grafik…</p>
          ) : rataMapel.length > 0 ? (
            <GrafikBatangHorizontal data={rataMapel} />
          ) : (
            <BelumAdaData />
          )}
        </section>
      )}

      {/* ------------ f. Sesi olahraga per bulan ------------ */}
      {galatOlahraga ? (
        <KartuGalat
          pesan={`Gagal memuat data grafik "Sesi olahraga per bulan": ${galatOlahraga}`}
          onCobaLagi={() => void muatOlahraga()}
        />
      ) : (
        <section className="kartu">
          <h2>Sesi olahraga per bulan</h2>
          <LabelCakupan teks={CAKUPAN_SEMUA} />
          <p className="catatan-kaki" style={{ marginTop: 0 }}>
            Jumlah sesi olahraga yang tercatat pada tiap bulan (6
            bulan terakhir).
          </p>
          {sesiPerBulan === null ? (
            <p className="catatan-kaki">Memuat grafik…</p>
          ) : sesiPerBulan.length > 0 ? (
            <GrafikBatangVertikal
              data={sesiPerBulan}
              gaya="bulat"
              satuan="sesi"
            />
          ) : (
            <BelumAdaData />
          )}
        </section>
      )}
    </>
  );
}

/**
 * Pilihan semester untuk filter donat: utamakan daftar semester dari
 * lapisan data diniyyah (nama + tahun ajaran); bila daftar itu kosong
 * (mis. baris semester belum dibuat), turunkan pilihan unik dari
 * baris rekap semester yang tersedia agar filter tetap bisa dipakai.
 */
function opsiSemesterDari(
  daftar: SemesterRef[],
  baris: BarisRekapSemester[],
): OpsiSemester[] {
  if (daftar.length > 0) {
    return daftar.map((s) => ({
      id: s.id,
      label: `${s.nama} · ${s.tahunAjaran}`,
    }));
  }
  const unik = new Map<string, string>();
  for (const b of baris) {
    if (!unik.has(b.semesterId)) unik.set(b.semesterId, b.semesterNama);
  }
  return [...unik.entries()].map(([id, nama]) => ({ id, label: nama }));
}
