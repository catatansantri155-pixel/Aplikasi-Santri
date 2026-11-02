"use client";

/**
 * Halaman Detail Santri — Jalur C (kerangka + Kehadiran), Jalur F
 * (Hifzh, Diniyyah, Catatan), Tahap 2.
 * Kerangka tab: Kehadiran | Hifzh | Diniyyah | Catatan.
 * - Tab Kehadiran (Jalur C): riwayat + ringkasan status santri ini.
 * - Tab Hifzh (Jalur F): riwayat setoran Buku Hafalan + hasil tes
 *   semester ringkas, dibaca dari src/lib/data/hifzh.ts.
 * - Tab Diniyyah (Jalur F): PENANDA TERSTRUKTUR — daftar mapel & rumus
 *   rata-rata masih menunggu user, jadi TIDAK ada nilai yang dikarang.
 * - Tab Catatan (Jalur F): daftar catatan dari DATA CONTOH LOKAL di
 *   file ini (lihat CATATAN_CONTOH_LOKAL) selama lib/data/catatan
 *   jalur lain belum ada; akan diganti ke lapisan data itu nanti.
 * Data dibaca lewat lapisan data (src/lib/data/); selama env Supabase
 * belum terisi, yang tampil adalah DATA CONTOH FIKSI.
 */
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PenandaTahap, { KartuPlaceholder } from "@/components/PenandaTahap";
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
  ambilSetoranTerakhir,
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

type KunciTab = "kehadiran" | "hifzh" | "diniyyah" | "catatan";

const TAB: { kunci: KunciTab; label: string }[] = [
  { kunci: "kehadiran", label: "Kehadiran" },
  { kunci: "hifzh", label: "Hifzh" },
  { kunci: "diniyyah", label: "Diniyyah" },
  { kunci: "catatan", label: "Catatan" },
];

/** Warna lencana status (selaras palet kop + pembeda status). */
const GAYA_STATUS: Record<StatusKehadiran, { latar: string; teks: string }> = {
  hadir: { latar: "#e6f2ec", teks: "#0b4d36" },
  sakit: { latar: "#fff3d6", teks: "#7a5b00" },
  izin: { latar: "#e3ecfb", teks: "#1d4e8a" },
  alpa: { latar: "#fbe7e7", teks: "#8a1f1f" },
};

function LencanaStatus({ status }: { status: StatusKehadiran }) {
  const gaya = GAYA_STATUS[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: gaya.latar,
        color: gaya.teks,
      }}
    >
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
  const lancar = nilai === "L";
  return (
    <span
      style={{
        display: "inline-block",
        minWidth: 34,
        textAlign: "center",
        padding: "2px 10px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 13,
        background: lancar ? "var(--hijau-muda)" : "#fbe9e7",
        color: lancar ? "var(--hijau-gelap)" : "#8e2f24",
        border: `1px solid ${lancar ? "var(--hijau-kop)" : "#d08a80"}`,
      }}
    >
      {nilai} · {LABEL_NILAI_SETORAN[nilai]}
    </span>
  );
}

const GAYA_HASIL: Record<HasilUjian, { latar: string; teks: string; garis: string }> = {
  M: { latar: "var(--hijau-kop)", teks: "#ffffff", garis: "var(--hijau-kop)" },
  BS: { latar: "var(--hijau-muda)", teks: "var(--hijau-gelap)", garis: "var(--hijau-kop)" },
  B: { latar: "#eef4e6", teks: "#3d6212", garis: "var(--hijau-logo)" },
  C: { latar: "#fdf3d7", teks: "#7a5b00", garis: "var(--emas)" },
  K: { latar: "#fdeed3", teks: "#8a5312", garis: "#d9930d" },
  G: { latar: "#fbe9e7", teks: "#8e2f24", garis: "#d08a80" },
};

function LencanaHasil({ hasil }: { hasil: HasilUjian }) {
  const gaya = GAYA_HASIL[hasil];
  return (
    <span
      style={{
        display: "inline-block",
        minWidth: 40,
        textAlign: "center",
        padding: "2px 10px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 13,
        background: gaya.latar,
        color: gaya.teks,
        border: `1px solid ${gaya.garis}`,
      }}
    >
      {hasil} · {LABEL_HASIL_UJIAN[hasil]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* DATA CONTOH LOKAL — CATATAN MUSYRIF (SEMENTARA)                      */
/*                                                                      */
/* Lapisan data catatan (src/lib/data/catatan.ts) dikerjakan jalur      */
/* Tahap 2 lain dan BELUM ada saat tab ini diisi, jadi daftar catatan   */
/* di bawah ini adalah contoh fiktif yang tinggal di file ini sendiri,  */
/* dikunci ke id santri contoh dari src/lib/contoh/santri-contoh.ts.    */
/* BEGITU lib/data/catatan tersedia, fungsi catatanContohUntukSantri()  */
/* di bawah WAJIB diganti panggilan ke lapisan data itu dan data lokal  */
/* ini dihapus. Nama santri/pelapor di sini FIKSI, bukan data asli.     */
/* ------------------------------------------------------------------ */

type KategoriCatatan = "akhlaq" | "adab" | "ibadah_shalat" | "lainnya";

const LABEL_KATEGORI_CATATAN: Record<KategoriCatatan, string> = {
  akhlaq: "Akhlaq",
  adab: "Adab",
  ibadah_shalat: "Ibadah Shalat",
  lainnya: "Lainnya",
};

interface CatatanContohLokal {
  id: string;
  santriId: string;
  /** Format ISO: YYYY-MM-DD */
  tanggal: string;
  kategori: KategoriCatatan;
  isi: string;
  pelaporNama: string;
}

const ID_CONTOH_ALIF = "d0000000-0000-4000-8000-000000000001";
const ID_CONTOH_CANDRA = "d0000000-0000-4000-8000-000000000003";
const ID_CONTOH_EKO = "d0000000-0000-4000-8000-000000000005";

const CATATAN_CONTOH_LOKAL: CatatanContohLokal[] = [
  {
    id: "catatan-lokal-1",
    santriId: ID_CONTOH_ALIF,
    tanggal: "2026-11-01",
    kategori: "akhlaq",
    isi: "Membantu teman sekelasnya menyiapkan tempat wudu sebelum shalat Zhuhur berjamaah.",
    pelaporNama: "Ust. Musyrif Contoh",
  },
  {
    id: "catatan-lokal-2",
    santriId: ID_CONTOH_ALIF,
    tanggal: "2026-10-30",
    kategori: "ibadah_shalat",
    isi: "Berjamaah Subuh di awal waktu dan menjaga kekhusyukan sampai salam.",
    pelaporNama: "Ust. Musyrif Contoh",
  },
  {
    id: "catatan-lokal-3",
    santriId: ID_CONTOH_ALIF,
    tanggal: "2026-10-27",
    kategori: "adab",
    isi: "Menjaga adab makan: makan dengan tangan kanan dan tidak berbicara saat mulut penuh.",
    pelaporNama: "Ust. Pengajar Contoh",
  },
  {
    id: "catatan-lokal-4",
    santriId: ID_CONTOH_CANDRA,
    tanggal: "2026-10-31",
    kategori: "adab",
    isi: "Perlu diingatkan menjaga kerapian loker dan sandal di depan kamar.",
    pelaporNama: "Ust. Musyrif Contoh",
  },
  {
    id: "catatan-lokal-5",
    santriId: ID_CONTOH_EKO,
    tanggal: "2026-10-29",
    kategori: "lainnya",
    isi: "Mengikuti olahraga Kamis pagi dengan semangat; menjadi contoh untuk adik kelasnya.",
    pelaporNama: "Ust. Musyrif Contoh",
  },
];

/** Catatan contoh lokal untuk satu santri, terbaru lebih dulu. */
function catatanContohUntukSantri(santriId: string): CatatanContohLokal[] {
  return CATATAN_CONTOH_LOKAL.filter((c) => c.santriId === santriId).sort(
    (a, b) => b.tanggal.localeCompare(a.tanggal),
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
  const [sumberHifzhContoh, setSumberHifzhContoh] = useState(false);
  const [sumberContoh, setSumberContoh] = useState(false);
  const [tabAktif, setTabAktif] = useState<KunciTab>("kehadiran");
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;
    Promise.all([
      ambilDetailSantri(id),
      ambilRiwayatKehadiranSantri(id),
      ambilLogRevisiSantri(id),
      // Tab Hifzh: setoran terakhir lintas santri dari lapisan data
      // hifzh, disaring ke santri ini di bawah (pada data Supabase,
      // santriId baris setoran memang id santri ini).
      ambilSetoranTerakhir(50),
      ambilUjianSemester(id),
      ambilJadwalSesi("diniyyah"),
    ])
      .then(
        ([
          detail,
          riwayatHasil,
          logHasil,
          setoranHasil,
          ujianHasil,
          jadwalHasil,
        ]) => {
          if (!aktif) return;
          setSantri(detail.data);
          setRiwayat(riwayatHasil.data);
          setLogRevisi(logHasil.data);
          setSetoran(
            setoranHasil.data.filter((s) => s.santriId === id).slice(0, 10),
          );
          setUjian(ujianHasil.data);
          setJadwalDiniyyah(jadwalHasil.data);
          setSumberHifzhContoh(
            setoranHasil.sumber === "contoh" || ujianHasil.sumber === "contoh",
          );
          setSumberContoh(
            detail.sumberContoh || riwayatHasil.sumberContoh || logHasil.sumberContoh,
          );
          setMemuat(false);
        },
      )
      .catch((e: unknown) => {
        if (!aktif) return;
        setGalat(e instanceof Error ? e.message : "Gagal memuat detail santri.");
        setMemuat(false);
      });
    return () => {
      aktif = false;
    };
  }, [id]);

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
    return (
      <>
        <PenandaTahap teks="MEMUAT…" />
        <p className="catatan-kaki">Memuat detail santri…</p>
      </>
    );
  }

  if (galat) {
    return (
      <>
        <PenandaTahap teks="DATA BELUM BISA DIMUAT" />
        <section className="kartu">
          <h2>Terjadi kendala</h2>
          <p>{galat}</p>
          <p>
            <Link href="/santri">Kembali ke daftar santri</Link>
          </p>
        </section>
      </>
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
      <p style={{ margin: "0 0 8px" }}>
        <Link href="/santri">← Daftar Santri</Link>
      </p>
      <h1 className="judul-halaman">{santri.nama}</h1>
      <p className="subjudul">
        {santri.kelasNama} · Ayah/Wali: {santri.namaAyahWali}
        {santri.nis ? ` · NIS ${santri.nis}` : ""}
      </p>

      {/* Kerangka tab — bisa diklik; isi per tab di bawah. */}
      <div
        role="tablist"
        aria-label="Bagian data santri"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          marginBottom: 14,
          borderBottom: "1px solid var(--garis)",
        }}
      >
        {TAB.map((t) => {
          const aktifTab = tabAktif === t.kunci;
          return (
            <button
              key={t.kunci}
              role="tab"
              aria-selected={aktifTab}
              onClick={() => setTabAktif(t.kunci)}
              style={{
                minHeight: "var(--tinggi-sentuh)",
                padding: "10px 14px",
                border: "none",
                borderBottom: aktifTab
                  ? "3px solid var(--hijau-kop)"
                  : "3px solid transparent",
                background: "transparent",
                color: aktifTab ? "var(--hijau-gelap)" : "var(--teks-redup)",
                fontSize: 15,
                fontWeight: aktifTab ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
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
                <span
                  key={s}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    background: GAYA_STATUS[s].latar,
                    color: GAYA_STATUS[s].teks,
                  }}
                >
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
          <KartuPlaceholder judul="Modul Diniyyah — menunggu ketetapan resmi">
            <PenandaTahap teks="BELUM ADA NILAI · MENUNGGU PDF JADWAL & RUMUS" />
            <p>
              Tab ini sengaja belum menampilkan angka apa pun: daftar mapel
              per slot dan rumus nilai rata-rata belum ditetapkan user, jadi
              tidak ada nilai yang dikarang di sini.
            </p>
          </KartuPlaceholder>

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

          <section className="kartu">
            <h2>Struktur nilai (per semester)</h2>
            <div style={{ display: "grid", gap: 6 }}>
              <div>· Nilai harian per mapel — menunggu daftar mapel resmi</div>
              <div>· Nilai ujian semester gasal</div>
              <div>
                · Nilai rata-rata gasal — rumus menunggu konfirmasi user
                (rata-rata sederhana atau berbobot)
              </div>
              <div>· Nilai ujian semester genap</div>
              <div>
                · Nilai rata-rata genap — rumus menunggu konfirmasi user
              </div>
            </div>
            <p className="catatan-kaki" style={{ marginTop: 10 }}>
              Begitu PDF jadwal diniyyah dan rumus rata-rata diterima, tab
              ini diisi modul nilai diniyyah tanpa mengubah kerangka
              halamannya.
            </p>
          </section>
        </>
      )}

      {tabAktif === "catatan" && (
        <section className="kartu">
          <h2>Catatan keseharian santri ini</h2>
          <PenandaTahap teks="DATA CONTOH LOKAL · SEMENTARA — MENUNGGU lib/data/catatan" />
          {catatanContohUntukSantri(santri.id).length === 0 && (
            <p>Belum ada catatan contoh untuk santri ini.</p>
          )}
          <div style={{ display: "grid", gap: 12 }}>
            {catatanContohUntukSantri(santri.id).map((c) => (
              <div key={c.id}>
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
                  <span style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                    {formatTanggal(c.tanggal)}
                  </span>
                </div>
                <p style={{ margin: "4px 0" }}>{c.isi}</p>
                <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                  Pelapor: {c.pelaporNama}
                </div>
              </div>
            ))}
          </div>
          <p className="catatan-kaki" style={{ marginTop: 10 }}>
            Pada aplikasi asli, catatan dibaca dari database dan nama
            pelapor selalu terisi otomatis dari akun yang masuk — tidak
            bisa dikosongkan.
          </p>
        </section>
      )}
    </>
  );
}
