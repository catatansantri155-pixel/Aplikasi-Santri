"use client";

/**
 * Halaman Rekap — Jalur F, Tahap 2.
 * - Rekap kehadiran pekanan & semesteran: tabel per santri + ringkasan
 *   per kelas (jumlah H/S/I/A dan persen hadir), dari view
 *   rekap_kehadiran_pekanan / rekap_kehadiran_semester lewat
 *   src/lib/data/rekap.ts.
 * - Grafik hifzh sederhana: batang bertumpuk per pekan/bulan per jenis
 *   setoran (BC/BR/TS/LM) + proporsi L vs U, digambar dengan div CSS
 *   biasa — tanpa library grafik tambahan.
 * Selama env Supabase belum terisi, semua angka adalah DATA CONTOH FIKSI
 * dan halaman menandainya dengan jelas.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import PenandaTahap from "@/components/PenandaTahap";
import PenjagaModul from "@/components/PenjagaModul";
import {
  ambilAgregatGrafikHifzh,
  ambilRekapPekanan,
  ambilRekapSemester,
  ringkasPerKelas,
  type AgregatGrafikHifzh,
  type BarisGrafikHifzh,
  type BarisRekapPekanan,
  type BarisRekapSemester,
  type RekapSantriInti,
} from "@/lib/data/rekap";
import { SEMUA_JENIS_SETORAN, type JenisSetoran } from "@/lib/hifzh";

type ModeRekap = "pekanan" | "semesteran";
type ModeGrafik = "mingguan" | "bulanan";

/* Gaya tabel setempat (globals.css belum punya kelas tabel; pola yang
   sama dipakai halaman Hifzh di src/app/hifzh/gaya.ts). */
const gayaPembungkusTabel: CSSProperties = { overflowX: "auto", margin: "0 -4px" };
const gayaTabel: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  minWidth: 560,
};
const gayaSelKepala: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid var(--garis)",
  color: "var(--teks-redup)",
  fontSize: 13,
  whiteSpace: "nowrap",
};
const gayaSelKepalaAngka: CSSProperties = { ...gayaSelKepala, textAlign: "center" };
const gayaSel: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--garis)",
  verticalAlign: "top",
};
const gayaSelAngka: CSSProperties = { ...gayaSel, textAlign: "center" };
const gayaPilih: CSSProperties = {
  minHeight: "var(--tinggi-sentuh)",
  padding: "10px 12px",
  fontSize: 15,
  border: "1px solid var(--garis)",
  borderRadius: 10,
  background: "var(--permukaan)",
  color: "var(--teks)",
  maxWidth: "100%",
};

const WARNA_JENIS: Record<JenisSetoran, string> = {
  BC: "var(--biru-buku)",
  BR: "var(--hijau-kop)",
  TS: "var(--emas)",
  LM: "var(--hijau-logo)",
};

function formatTanggal(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function labelBulan(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function formatPersen(n: number): string {
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

function gayaTombolMode(aktif: boolean): CSSProperties {
  return {
    minHeight: "var(--tinggi-sentuh)",
    padding: "10px 16px",
    borderRadius: 10,
    border: aktif ? "1px solid var(--hijau-kop)" : "1px solid var(--garis)",
    background: aktif ? "var(--hijau-kop)" : "var(--permukaan)",
    color: aktif ? "#ffffff" : "var(--teks)",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  };
}

/** Kelompokkan sel grafik per periode, urut kronologis (tertua di atas). */
function kelompokkanPeriode(
  baris: BarisGrafikHifzh[],
): { periodeMulai: string; sel: BarisGrafikHifzh[] }[] {
  const peta = new Map<string, BarisGrafikHifzh[]>();
  for (const b of baris) {
    const ada = peta.get(b.periodeMulai) ?? [];
    ada.push(b);
    peta.set(b.periodeMulai, ada);
  }
  return [...peta.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([periodeMulai, sel]) => ({ periodeMulai, sel }));
}

function GrafikPeriode({
  data,
  mode,
}: {
  data: BarisGrafikHifzh[];
  mode: ModeGrafik;
}) {
  const kelompok = useMemo(() => kelompokkanPeriode(data), [data]);
  if (kelompok.length === 0) {
    return <p>Belum ada data setoran hifzh pada rentang ini.</p>;
  }
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {kelompok.map(({ periodeMulai, sel }) => {
        const totalSetoran = sel.reduce((j, s) => j + s.jumlahSetoran, 0);
        const totalHalaman = sel.reduce((j, s) => j + s.totalHalaman, 0);
        const totalL = sel.reduce((j, s) => j + s.jumlahL, 0);
        const totalU = sel.reduce((j, s) => j + s.jumlahU, 0);
        const totalLU = totalL + totalU;
        const persenL = totalLU > 0 ? (totalL / totalLU) * 100 : 0;
        return (
          <div key={periodeMulai}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 6,
              }}
            >
              <strong>
                {mode === "mingguan"
                  ? `Pekan mulai ${formatTanggal(periodeMulai)}`
                  : labelBulan(periodeMulai)}
              </strong>
              <span style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                {totalSetoran} setoran · {totalHalaman} halaman
              </span>
            </div>
            {/* Batang bertumpuk per jenis setoran */}
            <div
              role="img"
              aria-label={`Setoran per jenis: ${sel
                .map((s) => `${s.jenis} ${s.jumlahSetoran}`)
                .join(", ")}`}
              style={{
                display: "flex",
                height: 18,
                borderRadius: 8,
                overflow: "hidden",
                background: "var(--hijau-muda)",
              }}
            >
              {SEMUA_JENIS_SETORAN.map((jenis) => {
                const s = sel.find((x) => x.jenis === jenis);
                if (!s || s.jumlahSetoran === 0 || totalSetoran === 0)
                  return null;
                return (
                  <div
                    key={jenis}
                    title={`${jenis}: ${s.jumlahSetoran} setoran, ${s.totalHalaman} halaman`}
                    style={{
                      width: `${(s.jumlahSetoran / totalSetoran) * 100}%`,
                      background: WARNA_JENIS[jenis],
                    }}
                  />
                );
              })}
            </div>
            {/* Proporsi L vs U */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
              }}
            >
              <div
                role="img"
                aria-label={`Lancar ${totalL}, Ulang ${totalU}`}
                style={{
                  flex: 1,
                  display: "flex",
                  height: 8,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "#fbe9e7",
                }}
              >
                <div
                  style={{
                    width: `${persenL}%`,
                    background: "var(--hijau-kop)",
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: "var(--teks-redup)" }}>
                L {totalL} · U {totalU} ({formatPersen(Math.round(persenL * 10) / 10)} Lancar)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabelSantri({ baris }: { baris: RekapSantriInti[] }) {
  if (baris.length === 0) {
    return <p>Belum ada baris rekap pada periode ini.</p>;
  }
  return (
    <div style={gayaPembungkusTabel}>
      <table style={gayaTabel}>
        <thead>
          <tr>
            <th style={gayaSelKepala}>Santri</th>
            <th style={gayaSelKepala}>Kelas</th>
            <th style={gayaSelKepalaAngka}>Hadir</th>
            <th style={gayaSelKepalaAngka}>Sakit</th>
            <th style={gayaSelKepalaAngka}>Izin</th>
            <th style={gayaSelKepalaAngka}>Alpa</th>
            <th style={gayaSelKepalaAngka}>Total</th>
            <th style={gayaSelKepalaAngka}>% Hadir</th>
          </tr>
        </thead>
        <tbody>
          {baris.map((b) => (
            <tr key={b.santriId}>
              <td style={gayaSel}>{b.santriNama}</td>
              <td style={gayaSel}>{b.kelasNama}</td>
              <td style={gayaSelAngka}>{b.jumlahHadir}</td>
              <td style={gayaSelAngka}>{b.jumlahSakit}</td>
              <td style={gayaSelAngka}>{b.jumlahIzin}</td>
              <td style={gayaSelAngka}>{b.jumlahAlpa}</td>
              <td style={gayaSelAngka}>{b.totalSesi}</td>
              <td style={{ ...gayaSelAngka, fontWeight: 700 }}>
                {formatPersen(b.persenHadir)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelKelas({ baris }: { baris: RekapSantriInti[] }) {
  const ringkasan = useMemo(() => ringkasPerKelas(baris), [baris]);
  if (ringkasan.length === 0) return null;
  return (
    <div style={gayaPembungkusTabel}>
      <table style={gayaTabel}>
        <thead>
          <tr>
            <th style={gayaSelKepala}>Kelas</th>
            <th style={gayaSelKepalaAngka}>Santri</th>
            <th style={gayaSelKepalaAngka}>Hadir</th>
            <th style={gayaSelKepalaAngka}>Sakit</th>
            <th style={gayaSelKepalaAngka}>Izin</th>
            <th style={gayaSelKepalaAngka}>Alpa</th>
            <th style={gayaSelKepalaAngka}>Total</th>
            <th style={gayaSelKepalaAngka}>% Hadir</th>
          </tr>
        </thead>
        <tbody>
          {ringkasan.map((r) => (
            <tr key={r.kelasId || r.kelasNama}>
              <td style={gayaSel}>{r.kelasNama}</td>
              <td style={gayaSelAngka}>{r.jumlahSantri}</td>
              <td style={gayaSelAngka}>{r.jumlahHadir}</td>
              <td style={gayaSelAngka}>{r.jumlahSakit}</td>
              <td style={gayaSelAngka}>{r.jumlahIzin}</td>
              <td style={gayaSelAngka}>{r.jumlahAlpa}</td>
              <td style={gayaSelAngka}>{r.totalSesi}</td>
              <td style={{ ...gayaSelAngka, fontWeight: 700 }}>
                {formatPersen(r.persenHadir)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Gerbang peran modul (src/lib/akses.ts): halaman Rekap hanya
 * dirender untuk admin, kedua pengajar, dan musyrif; wali menerima
 * pesan penolakan dari PenjagaModul (ringkasan anaknya ada di beranda
 * & detail santri).
 */
export default function HalamanRekap() {
  return (
    <PenjagaModul modul="rekap">
      <IsiHalamanRekap />
    </PenjagaModul>
  );
}

function IsiHalamanRekap() {
  const [pekanan, setPekanan] = useState<BarisRekapPekanan[]>([]);
  const [semesteran, setSemesteran] = useState<BarisRekapSemester[]>([]);
  const [grafik, setGrafik] = useState<AgregatGrafikHifzh>({
    mingguan: [],
    bulanan: [],
  });
  const [sumberContoh, setSumberContoh] = useState(false);
  const [modeRekap, setModeRekap] = useState<ModeRekap>("pekanan");
  const [pekanTerpilih, setPekanTerpilih] = useState<string>("");
  const [semesterTerpilih, setSemesterTerpilih] = useState<string>("");
  const [modeGrafik, setModeGrafik] = useState<ModeGrafik>("mingguan");
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;
    Promise.all([ambilRekapPekanan(), ambilRekapSemester(), ambilAgregatGrafikHifzh()])
      .then(([hasilPekan, hasilSemester, hasilGrafik]) => {
        if (!aktif) return;
        setPekanan(hasilPekan.data);
        setSemesteran(hasilSemester.data);
        setGrafik(hasilGrafik.data);
        setSumberContoh(
          hasilPekan.sumberContoh ||
            hasilSemester.sumberContoh ||
            hasilGrafik.sumberContoh,
        );
        // Pilihan awal: pekan terakhir & semester pertama yang tersedia.
        const pekanTerakhir = hasilPekan.data.reduce<string>(
          (maks, b) => (b.pekanMulai > maks ? b.pekanMulai : maks),
          "",
        );
        setPekanTerpilih(pekanTerakhir);
        setSemesterTerpilih(hasilSemester.data[0]?.semesterId ?? "");
        setMemuat(false);
      })
      .catch((e: unknown) => {
        if (!aktif) return;
        setGalat(e instanceof Error ? e.message : "Gagal memuat rekap.");
        setMemuat(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  const daftarPekan = useMemo(
    () =>
      [...new Set(pekanan.map((b) => b.pekanMulai))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [pekanan],
  );
  const daftarSemester = useMemo(() => {
    const peta = new Map<string, string>();
    for (const b of semesteran) peta.set(b.semesterId, b.semesterNama);
    return [...peta.entries()].map(([id, nama]) => ({ id, nama }));
  }, [semesteran]);

  const barisAktif: RekapSantriInti[] =
    modeRekap === "pekanan"
      ? pekanan.filter((b) => b.pekanMulai === pekanTerpilih)
      : semesteran.filter((b) => b.semesterId === semesterTerpilih);

  if (memuat) {
    return (
      <>
        <PenandaTahap teks="MEMUAT…" />
        <h1 className="judul-halaman">Rekap</h1>
        <p className="catatan-kaki">Memuat rekap kehadiran & grafik hifzh…</p>
      </>
    );
  }

  if (galat) {
    return (
      <>
        <PenandaTahap teks="DATA BELUM BISA DIMUAT" />
        <h1 className="judul-halaman">Rekap</h1>
        <section className="kartu">
          <h2>Terjadi kendala</h2>
          <p>{galat}</p>
        </section>
      </>
    );
  }

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">Rekap</h1>
      <p className="subjudul">
        Rekap kehadiran terjumlah per pekan dan per semester, per santri dan
        per kelas, beserta grafik perkembangan hifzh. Di database, angka ini
        dibaca dari view agregat (rekap_kehadiran_pekanan,
        rekap_kehadiran_semester, grafik_hifzh_mingguan,
        grafik_hifzh_bulanan) yang mengikuti RLS pembacanya.
      </p>

      <section className="kartu">
        <h2>Rekap kehadiran</h2>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            style={gayaTombolMode(modeRekap === "pekanan")}
            onClick={() => setModeRekap("pekanan")}
          >
            Pekanan
          </button>
          <button
            type="button"
            style={gayaTombolMode(modeRekap === "semesteran")}
            onClick={() => setModeRekap("semesteran")}
          >
            Semesteran
          </button>
          {modeRekap === "pekanan" ? (
            <select
              aria-label="Pilih pekan"
              style={gayaPilih}
              value={pekanTerpilih}
              onChange={(e) => setPekanTerpilih(e.target.value)}
            >
              {daftarPekan.map((p) => (
                <option key={p} value={p}>
                  Pekan mulai {formatTanggal(p)}
                </option>
              ))}
            </select>
          ) : (
            <select
              aria-label="Pilih semester"
              style={gayaPilih}
              value={semesterTerpilih}
              onChange={(e) => setSemesterTerpilih(e.target.value)}
            >
              {daftarSemester.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          )}
        </div>

        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Per santri</h3>
        <TabelSantri baris={barisAktif} />
        <h3 style={{ margin: "16px 0 8px", fontSize: 15 }}>Ringkasan per kelas</h3>
        <TabelKelas baris={barisAktif} />
        <p className="catatan-kaki" style={{ marginTop: 10 }}>
          Persen hadir = jumlah Hadir dibagi total sesi pada periode itu.
          Tanggal resmi semester gasal/genap masih menunggu penetapan user;
          pada mode contoh semester yang tampil adalah semester contoh.
        </p>
      </section>

      <section className="kartu">
        <h2>Grafik perkembangan hifzh</h2>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            style={gayaTombolMode(modeGrafik === "mingguan")}
            onClick={() => setModeGrafik("mingguan")}
          >
            Mingguan
          </button>
          <button
            type="button"
            style={gayaTombolMode(modeGrafik === "bulanan")}
            onClick={() => setModeGrafik("bulanan")}
          >
            Bulanan
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          {SEMUA_JENIS_SETORAN.map((jenis) => (
            <span
              key={jenis}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: WARNA_JENIS[jenis],
                  display: "inline-block",
                }}
              />
              {jenis}
            </span>
          ))}
          <span style={{ color: "var(--teks-redup)" }}>
            BC = baca, BR = baru, TS = tes, LM = lama
          </span>
        </div>
        <GrafikPeriode
          data={modeGrafik === "mingguan" ? grafik.mingguan : grafik.bulanan}
          mode={modeGrafik}
        />
        <p className="catatan-kaki" style={{ marginTop: 12 }}>
          Batang atas menunjukkan jumlah setoran per jenis pada periode itu;
          batang tipis di bawahnya menunjukkan proporsi nilai L (Lancar,
          hijau) berbanding U (Ulang). Pada mode contoh, agregat dihitung
          dari setoran contoh modul hifzh yang jumlahnya masih sedikit.
        </p>
      </section>
    </>
  );
}
