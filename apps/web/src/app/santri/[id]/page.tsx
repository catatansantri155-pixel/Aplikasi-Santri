"use client";

/**
 * Halaman Detail Santri — Jalur C (kerangka + Kehadiran), Jalur F
 * (Hifzh, Diniyyah, Catatan), Tahap 2.
 * Kerangka tab: Kehadiran | Hifzh | Diniyyah | Catatan.
 * - Tab Kehadiran (Jalur C): riwayat + ringkasan status santri ini.
 * - Tab Hifzh (Jalur F): riwayat setoran Buku Hafalan + hasil tes
 *   semester ringkas, dibaca dari src/lib/data/hifzh.ts.
 * - Tab Diniyyah: ringkasan nilai per mapel santri ini dari
 *   src/lib/data/diniyyah.ts (nilai harian + ujian gasal/genap +
 *   rata-rata gabungan). Daftar mapel masih CONTOH menunggu PDF
 *   jadwal dan rata-rata masih RUMUS SEMENTARA — keduanya ditandai
 *   apa adanya di UI, mengikuti modul Diniyyah.
 * - Tab Catatan: daftar catatan santri ini dari
 *   src/lib/data/catatan.ts (ambilCatatanSantri).
 * Data dibaca lewat lapisan data (src/lib/data/); selama env Supabase
 * belum terisi, yang tampil adalah DATA CONTOH FIKSI.
 */
import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import {
  Ikon,
  LingkaranIkon,
  type NamaIkon,
  type WarnaTint,
} from "@/components/Ikon";
import { ambilDetailSantri, type Santri } from "@/lib/data/santri";
import {
  ambilJadwalSesi,
  ambilLogRevisiSantri,
  ambilRiwayatKehadiranSantri,
  LABEL_SESI,
  LABEL_STATUS,
  STATUS_KEHADIRAN,
  type BarisKehadiran,
  type JadwalSesi,
  type LogRevisi,
  type StatusKehadiran,
} from "@/lib/data/kehadiran";
import {
  ambilSetoranSantri,
  ambilUjianSemester,
  type BarisUjianHifzh,
  type SetoranHifzh,
} from "@/lib/data/hifzh";
import {
  LABEL_HASIL_UJIAN,
  LABEL_NILAI_SETORAN,
  type HasilUjian,
  type NilaiSetoran,
} from "@/lib/hifzh";
import {
  ambilNilaiHarianSantri,
  ambilNilaiUjianSantri,
  CATATAN_RUMUS_SEMENTARA,
  formatNilai,
  hitungRingkasanMapel,
  LABEL_MAPEL_CONTOH,
  MAPEL_DINIYYAH_CONTOH,
  type NilaiHarian,
  type NilaiUjian,
} from "@/lib/data/diniyyah";
import {
  ambilCatatanSantri,
  LABEL_KATEGORI as LABEL_KATEGORI_CATATAN,
  type CatatanMusyrif,
  type KategoriCatatan,
} from "@/lib/data/catatan";

type KunciTab = "kehadiran" | "hifzh" | "diniyyah" | "catatan";

const TAB: { kunci: KunciTab; label: string }[] = [
  { kunci: "kehadiran", label: "Kehadiran" },
  { kunci: "hifzh", label: "Hifzh" },
  { kunci: "diniyyah", label: "Diniyyah" },
  { kunci: "catatan", label: "Catatan" },
];

/** Lencana status kehadiran — kelas bersama .lencana di globals.css. */
function LencanaStatus({ status }: { status: StatusKehadiran }) {
  return (
    <span className={`lencana lencana--${status}`}>
      {LABEL_STATUS[status]}
    </span>
  );
}

function formatTanggal(iso: string): string {
  const tanggal = new Date(`${iso}T00:00:00`);
  return tanggal.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Lencana nilai & hasil hifzh (pola warna sama dengan halaman Hifzh)   */
/* ------------------------------------------------------------------ */

function LencanaNilai({ nilai }: { nilai: NilaiSetoran }) {
  return (
    <span
      className={`lencana lencana--besar ${
        nilai === "L" ? "lencana--l" : "lencana--u"
      }`}
    >
      {nilai} · {LABEL_NILAI_SETORAN[nilai]}
    </span>
  );
}

/** Lencana hasil ujian — kelas .lencana--hasil-* (M emas → G merah). */
function LencanaHasil({ hasil }: { hasil: HasilUjian }) {
  return (
    <span
      className={`lencana lencana--besar lencana--hasil-${hasil.toLowerCase()}`}
    >
      {hasil} · {LABEL_HASIL_UJIAN[hasil]}
    </span>
  );
}


/* ------------------------------------------------------------------ */
/* Tab Catatan & Diniyyah — tampilan                                    */
/*                                                                      */
/* Data kedua tab dibaca dari lapisan data (src/lib/data/catatan.ts    */
/* dan src/lib/data/diniyyah.ts) yang bercabang contoh/Supabase        */
/* sendiri; halaman ini TIDAK menyimpan data contoh lokal apa pun.     */
/* ------------------------------------------------------------------ */

/** Ikon & warna tint per kategori catatan (Panduan Desain). */
const IKON_KATEGORI_CATATAN: Record<
  KategoriCatatan,
  { ikon: NamaIkon; warna: WarnaTint }
> = {
  akhlaq: { ikon: "hati", warna: "merah" },
  adab: { ikon: "bintang", warna: "kuning" },
  ibadah_shalat: { ikon: "bulan", warna: "biru" },
  lainnya: { ikon: "lapisan", warna: "hijau" },
};

/** Gaya sel tabel ringkasan diniyyah (selaras halaman modul Diniyyah).
 *  Dirampingkan agar tabel muat lebar layar tanpa gulir horizontal. */
const GAYA_SEL: CSSProperties = {
  padding: "7px 6px",
  borderBottom: "1px solid var(--garis)",
  fontSize: 13,
  textAlign: "left",
  verticalAlign: "top",
};

const GAYA_SEL_ANGKA: CSSProperties = {
  ...GAYA_SEL,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

/** Label mapel dengan penanda contoh (daftar mapel resmi belum ada). */
function LabelMapel({ mapel }: { mapel: string }) {
  return (
    <>
      {mapel}{" "}
      <span style={{ color: "var(--teks-redup)", fontSize: 12 }}>
        (contoh)
      </span>
    </>
  );
}

export default function HalamanDetailSantri({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [santri, setSantri] = useState<Santri | null>(null);
  const [riwayat, setRiwayat] = useState<BarisKehadiran[]>([]);
  const [logRevisi, setLogRevisi] = useState<LogRevisi[]>([]);
  const [setoran, setSetoran] = useState<SetoranHifzh[]>([]);
  const [ujian, setUjian] = useState<BarisUjianHifzh[]>([]);
  const [jadwalDiniyyah, setJadwalDiniyyah] = useState<JadwalSesi[]>([]);
  const [harianDiniyyah, setHarianDiniyyah] = useState<NilaiHarian[]>([]);
  const [ujianDiniyyah, setUjianDiniyyah] = useState<NilaiUjian[]>([]);
  const [catatan, setCatatan] = useState<CatatanMusyrif[]>([]);
  /** Batas riwayat setoran yang dimuat (50 → 100 → 200, audit Fase 1). */
  const [batasSetoran, setBatasSetoran] = useState(50);
  const [sumberSetoranContoh, setSumberSetoranContoh] = useState(false);
  const [sumberUjianContoh, setSumberUjianContoh] = useState(false);
  const sumberHifzhContoh = sumberSetoranContoh || sumberUjianContoh;
  const [sumberContoh, setSumberContoh] = useState(false);
  const [tabAktif, setTabAktif] = useState<KunciTab>("kehadiran");
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const [
        detail,
        riwayatHasil,
        logHasil,
        ujianHasil,
        jadwalHasil,
        harianHasil,
        ujianDiniyyahHasil,
        catatanHasil,
      ] = await Promise.all([
        ambilDetailSantri(id),
        ambilRiwayatKehadiranSantri(id),
        ambilLogRevisiSantri(id),
        ambilUjianSemester(id),
        ambilJadwalSesi("diniyyah"),
        // Tab Diniyyah & Catatan: dari lapisan datanya masing-masing
        // (bercabang contoh/Supabase di dalamnya), BUKAN data lokal.
        ambilNilaiHarianSantri(id),
        ambilNilaiUjianSantri(id),
        ambilCatatanSantri(id),
      ]);
      setSantri(detail.data);
      setRiwayat(riwayatHasil.data);
      setLogRevisi(logHasil.data);
      setUjian(ujianHasil.data);
      setSumberUjianContoh(ujianHasil.sumber === "contoh");
      setJadwalDiniyyah(jadwalHasil.data);
      setHarianDiniyyah(harianHasil.data);
      setUjianDiniyyah(ujianDiniyyahHasil.data);
      setCatatan(catatanHasil.data);
      setSumberContoh(
        detail.sumberContoh ||
          riwayatHasil.sumberContoh ||
          logHasil.sumberContoh ||
          harianHasil.sumberContoh ||
          ujianDiniyyahHasil.sumberContoh ||
          catatanHasil.sumberContoh,
      );
    } catch (e: unknown) {
      setGalat(e instanceof Error ? e.message : "Gagal memuat detail santri.");
    } finally {
      setMemuat(false);
    }
  }, [id]);

  useEffect(() => {
    void muat();
  }, [muat]);

  /* Riwayat setoran KHUSUS santri ini (audit Fase 1): diambil dengan
     kueri per santri dari lapisan data, bukan lagi potongan 50 setoran
     terakhir lintas santri yang disaring di halaman — setoran anak
     bisa tidak muncul pada pola lama. Batas dapat dinaikkan pengguna
     lewat tombol "Muat lebih banyak" (50 → 100 → 200). */
  const muatSetoran = useCallback(
    async (batas: number) => {
      const hasil = await ambilSetoranSantri(id, batas);
      setSetoran(hasil.data);
      setSumberSetoranContoh(hasil.sumber === "contoh");
    },
    [id],
  );

  useEffect(() => {
    muatSetoran(batasSetoran).catch(() => setSetoran([]));
  }, [muatSetoran, batasSetoran]);

  const ringkasan = useMemo(() => {
    const hitung: Record<StatusKehadiran, number> = {
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
    };
    for (const b of riwayat) hitung[b.status] += 1;
    return hitung;
  }, [riwayat]);

  const ringkasanDiniyyah = useMemo(
    () => hitungRingkasanMapel(harianDiniyyah, ujianDiniyyah),
    [harianDiniyyah, ujianDiniyyah],
  );

  const logPerBaris = useMemo(() => {
    const peta = new Map<string, LogRevisi[]>();
    for (const l of logRevisi) {
      const ada = peta.get(l.kehadiranId) ?? [];
      ada.push(l);
      peta.set(l.kehadiranId, ada);
    }
    return peta;
  }, [logRevisi]);

  if (memuat) {
    return <p className="catatan-kaki">Memuat detail santri…</p>;
  }

  if (galat) {
    return (
      <section className="kartu">
        <h2>Data belum bisa dimuat</h2>
        <p>{galat}</p>
        <p>
          <button
            type="button"
            className="tombol tombol-sekunder"
            onClick={() => void muat()}
          >
            Coba lagi
          </button>{" "}
          <Link href="/santri">Kembali ke daftar santri</Link>
        </p>
      </section>
    );
  }

  if (!santri) {
    return (
      <>
        {sumberContoh && (
          <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
        )}
        <section className="kartu">
          <h2>Santri tidak ditemukan</h2>
          <p>
            Santri dengan alamat ini tidak ada, atau akun Anda tidak berhak
            melihatnya. Orang tua hanya bisa membuka data anaknya sendiri.
          </p>
          <p>
            <Link href="/santri">Kembali ke daftar santri</Link>
          </p>
        </section>
      </>
    );
  }

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      {/* Kepala halaman prototipe (PageHeader): tombol kembali
          kotak + nama sebagai judul + kelas/NIS/wali sebagai sub. */}
      <div className="kepala-halaman">
        <Link
          href="/santri"
          className="tombol-kembali"
          aria-label="Kembali ke daftar santri"
        >
          <Ikon nama="panah-kiri" ukuran={20} />
        </Link>
        <div style={{ minWidth: 0 }}>
          <h1 className="judul-halaman" style={{ margin: 0 }}>
            {santri.nama}
          </h1>
          <p className="subjudul" style={{ margin: 0 }}>
            {santri.kelasNama} · Ayah/Wali: {santri.namaAyahWali}
            {santri.nis ? ` · NIS ${santri.nis}` : ""}
          </p>
        </div>
      </div>

      {/* Tiga kartu ringkas prototipe — angka NYATA santri ini:
          jumlah setoran, persen hadir, rata-rata diniyyah. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: "Setoran tercatat", nilai: String(setoran.length) },
          {
            label: "Kehadiran",
            nilai:
              riwayat.length > 0
                ? `${Math.round((ringkasan.hadir / riwayat.length) * 100)}%`
                : "—",
          },
          {
            label: "Rata-rata diniyyah",
            nilai: (() => {
              const gabungan = ringkasanDiniyyah
                .map((r) => r.rataGabungan)
                .filter((x): x is number => x !== null);
              if (gabungan.length === 0) return "—";
              const rata =
                gabungan.reduce((a, b) => a + b, 0) / gabungan.length;
              return rata.toLocaleString("id-ID", {
                maximumFractionDigits: 1,
              });
            })(),
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              padding: 12,
              background: "var(--permukaan)",
              border: "1px solid var(--garis)",
              borderRadius: "var(--jari)",
              boxShadow: "var(--bayang)",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--teks-redup)",
              }}
            >
              {k.label}
            </span>
            <span
              style={{
                display: "block",
                fontSize: 20,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {k.nilai}
            </span>
          </div>
        ))}
      </div>

      {/* Kerangka tab pill — bisa diklik; isi per tab di bawah. */}
      <div role="tablist" aria-label="Bagian data santri" className="tab-pil">
        {TAB.map((t) => {
          const aktifTab = tabAktif === t.kunci;
          return (
            <button
              key={t.kunci}
              role="tab"
              aria-selected={aktifTab}
              onClick={() => setTabAktif(t.kunci)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabAktif === "kehadiran" && (
        <>
          <section className="kartu">
            <h2>Ringkasan kehadiran</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STATUS_KEHADIRAN.map((s) => (
                <span key={s} className={`lencana lencana--besar lencana--${s}`}>
                  {LABEL_STATUS[s]}: {ringkasan[s]}
                </span>
              ))}
            </div>
            <p className="catatan-kaki" style={{ marginTop: 10 }}>
              Dari {riwayat.length} sesi terakhir yang tercatat (hifzh &
              diniyyah). Rekap pekanan dan semesteran lengkap ada di modul
              Rekap.
            </p>
          </section>

          <section className="kartu">
            <h2>Riwayat kehadiran</h2>
            {riwayat.length === 0 && (
              <p>Belum ada catatan kehadiran untuk santri ini.</p>
            )}
            <div style={{ display: "grid", gap: 10 }}>
              {riwayat.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {formatTanggal(b.tanggal)}
                    </div>
                    <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                      {LABEL_SESI[b.sesiJenis]} · {b.jamLabel}
                      {b.pengisiNama ? ` · diisi ${b.pengisiNama}` : ""}
                    </div>
                    {(logPerBaris.get(b.id) ?? []).map((l) => (
                      <div
                        key={l.id}
                        style={{ color: "var(--teks-redup)", fontSize: 13 }}
                      >
                        Direvisi admin dari {LABEL_STATUS[l.statusLama]}:{" "}
                        {l.alasan}
                      </div>
                    ))}
                  </div>
                  <LencanaStatus status={b.status} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tabAktif === "hifzh" && (
        <>
          <section className="kartu">
            <h2>Riwayat setoran Buku Hafalan</h2>
            {setoran.length === 0 && (
              <p>Belum ada setoran tercatat untuk santri ini.</p>
            )}
            <div style={{ display: "grid", gap: 12 }}>
              {setoran.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {s.jenis} · {s.surat} ayat {s.ayatDari}–{s.ayatSampai}
                    </div>
                    <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                      {formatTanggal(s.tanggalMasehi)} ({s.tanggalHijriah}) ·
                      Halaman {s.halaman} · RG {s.rg} · KK {s.kk} · KB {s.kb}
                    </div>
                    {s.catatanRincian && (
                      <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                        Rincian kesalahan: {s.catatanRincian}
                      </div>
                    )}
                    <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                      Penyimak: {s.penyimakNama}
                      {s.tugasBerikutnya
                        ? ` · Tugas berikutnya: ${s.tugasBerikutnya}`
                        : ""}
                    </div>
                  </div>
                  <LencanaNilai nilai={s.nilaiHuruf} />
                </div>
              ))}
            </div>
            {setoran.length >= batasSetoran && batasSetoran < 200 && (
              <p style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="tombol tombol-sekunder"
                  onClick={() =>
                    setBatasSetoran((b) => (b < 100 ? 100 : 200))
                  }
                >
                  Muat lebih banyak setoran (kini menampilkan{" "}
                  {batasSetoran} terakhir)
                </button>
              </p>
            )}
            <p className="catatan-kaki" style={{ marginTop: 10 }}>
              Nilai L (Lancar) / U (Ulang) dihitung otomatis dari kesalahan
              RG/KK/KB mengikuti aturan Buku Hafalan. Grafik perkembangan
              mingguan & bulanan ada di halaman Rekap.
            </p>
          </section>

          <section className="kartu">
            <h2>Tes semester hifzh (ringkas)</h2>
            {ujian.length === 0 && (
              <p>Belum ada baris tes semester untuk santri ini.</p>
            )}
            <div style={{ display: "grid", gap: 10 }}>
              {ujian.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>Juz {u.juz}</div>
                    <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                      Halaman {u.halaman} · RG {u.rg} · KK {u.kk} · KB {u.kb}
                    </div>
                  </div>
                  <LencanaHasil hasil={u.hasil} />
                </div>
              ))}
            </div>
            <p className="catatan-kaki" style={{ marginTop: 10 }}>
              Hasil per juz (M/BS/B/C/K/G) dihitung dari KB hasil konversi
              bertahap: 3 RG = 1 KK, 3 KK = 1 KB. Sekali majelis tes adalah
              2 lembar.
            </p>
          </section>

          {sumberHifzhContoh && (
            <p className="catatan-kaki">
              Catatan mode contoh: id santri contoh modul hifzh sudah
              diselaraskan induk (2 Nov 2026) dengan daftar santri contoh
              utama, jadi riwayat tab ini terisi untuk santri yang punya
              setoran contoh. Pada data Supabase, setoran dan ujian terikat
              langsung ke id santri ini.
            </p>
          )}
        </>
      )}

      {tabAktif === "diniyyah" && (
        <>
          <section className="kartu">
            <h2>Nilai diniyyah per mapel</h2>
            <p>
              <strong>{LABEL_MAPEL_CONTOH}:</strong> daftar mata pelajaran
              ({MAPEL_DINIYYAH_CONTOH.join(", ")}) adalah contoh umum
              madrasah, bukan daftar resmi pondok — daftar resmi mengikuti
              PDF jadwal diniyyah dari user.
            </p>
            <p>
              Kolom rata-rata memakai <strong>rumus sementara</strong>{" "}
              (rata-rata sederhana). {CATATAN_RUMUS_SEMENTARA}
            </p>
            <div className="tabel-bungkus">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={GAYA_SEL}>Mapel (contoh)</th>
                    <th style={GAYA_SEL_ANGKA}>Rata-rata harian</th>
                    <th style={GAYA_SEL_ANGKA}>Ujian gasal</th>
                    <th style={GAYA_SEL_ANGKA}>Ujian genap</th>
                    <th style={GAYA_SEL_ANGKA}>
                      Rata-rata gabungan
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--teks-redup)",
                        }}
                      >
                        rumus sementara
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ringkasanDiniyyah.map((r) => (
                    <tr key={r.mapel}>
                      <td style={GAYA_SEL}>
                        <LabelMapel mapel={r.mapel} />
                      </td>
                      <td style={GAYA_SEL_ANGKA}>
                        {formatNilai(r.rataHarian)}
                        {r.jumlahNilaiHarian > 0 && (
                          <span
                            style={{
                              display: "block",
                              fontSize: 11,
                              color: "var(--teks-redup)",
                            }}
                          >
                            dari {r.jumlahNilaiHarian} nilai
                          </span>
                        )}
                      </td>
                      <td style={GAYA_SEL_ANGKA}>
                        {formatNilai(r.ujianGasal)}
                      </td>
                      <td style={GAYA_SEL_ANGKA}>
                        {formatNilai(r.ujianGenap)}
                      </td>
                      <td style={{ ...GAYA_SEL_ANGKA, fontWeight: 700 }}>
                        {formatNilai(r.rataGabungan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ margin: "16px 0 6px", fontSize: 15 }}>
              Rincian nilai harian terakhir
            </h3>
            {harianDiniyyah.length === 0 ? (
              <p>Belum ada nilai harian untuk santri ini.</p>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {harianDiniyyah.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      paddingBottom: 6,
                      borderBottom: "1px solid var(--garis)",
                      fontSize: 14,
                    }}
                  >
                    <span>
                      {formatTanggal(n.tanggal)} ·{" "}
                      <LabelMapel mapel={n.mapel} />
                    </span>
                    <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatNilai(n.nilai)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="kartu">
            <h2>Slot jadwal diniyyah</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {jadwalDiniyyah.map((j) => (
                <div
                  key={j.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{j.jamLabel}</span>
                  <span style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                    {j.mapel ?? "Mapel menunggu PDF jadwal resmi"}
                  </span>
                </div>
              ))}
              {jadwalDiniyyah.length === 0 && (
                <p>Slot jadwal belum tersedia.</p>
              )}
            </div>
          </section>

        </>
      )}

      {tabAktif === "catatan" && (
        <section className="kartu">
          <h2>Catatan keseharian santri ini</h2>
          {catatan.length === 0 && (
            <p>Belum ada catatan untuk santri ini.</p>
          )}
          <div style={{ display: "grid", gap: 14 }}>
            {catatan.map((c) => {
              const ikonKat = IKON_KATEGORI_CATATAN[c.kategori];
              return (
                <div
                  key={c.id}
                  style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                >
                  <LingkaranIkon nama={ikonKat.ikon} warna={ikonKat.warna} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {LABEL_KATEGORI_CATATAN[c.kategori]}
                      </div>
                      <span
                        style={{ color: "var(--teks-redup)", fontSize: 13 }}
                      >
                        {formatTanggal(c.tanggal)}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0" }}>{c.isi}</p>
                    <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                      Pelapor: {c.pelaporNama}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="catatan-kaki" style={{ marginTop: 10 }}>
            Catatan dibaca dari lapisan data catatan (database pada mode
            Supabase) dan nama pelapor selalu terisi otomatis dari akun
            yang masuk — tidak bisa dikosongkan.
          </p>
        </section>
      )}
    </>
  );
}
