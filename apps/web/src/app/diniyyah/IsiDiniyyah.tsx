"use client";

/**
 * Isi Halaman Diniyyah (komponen klien) — Jalur E, Tahap 2; dipecah
 * menjadi tiga tab pada audit Fase 3: Harian · Ujian · Ringkasan.
 * Tab aktif datang dari query URL (?tab=) yang dibaca page.tsx
 * (komponen server) — pola yang sama dengan halaman Laporan.
 * 1) Pilih santri & mapel, lalu isi nilai harian (per tanggal) dan nilai
 *    ujian per semester (gasal/genap).
 * 2) Tabel ringkasan per mapel: rata-rata harian, nilai ujian gasal,
 *    nilai ujian genap, dan rata-rata gabungan.
 *
 * DUA PENANDA KEJUJURAN di halaman ini (belum final, menunggu user):
 * - Daftar mapel masih MAPEL CONTOH — PDF jadwal diniyyah belum ada.
 *   Setiap kemunculan mapel di halaman ini dilabeli "contoh"; daftarnya
 *   hidup di satu konstanta MAPEL_DINIYYAH_CONTOH (lib/data/diniyyah.ts).
 * - Rata-rata memakai RUMUS SEMENTARA (rata-rata sederhana), ditandai
 *   jelas di tabel, menunggu rumus resmi dari user.
 * Slot waktu yang pasti dari rancangan: 10.30–11.30, Ba'da Zhuhur,
 * Ba'da Ashr, Ba'da Maghrib (jadwal kegiatan; nilai dicatat per tanggal).
 *
 * Form nilai ujian memilih semester LANGSUNG dari data semester
 * (ambilSemester). Bila database belum punya satu pun baris semester,
 * halaman menampilkan pesan jelas bahwa semester harus dibuat oleh
 * admin terlebih dahulu dan nilai ujian tidak bisa diisi — semester
 * tidak pernah dikarang di klien.
 *
 * Mode pantauan admin (keputusan user 4 Nov 2026): untuk ADMIN,
 * formulir Harian & Ujian disembunyikan — tab Ringkasan tetap tampil
 * beserta pemilih santri & mapel; input awal adalah tugas pengajar
 * diniyyah (bolehInput di src/lib/akses.ts).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import KartuGalat from "@/components/KartuGalat";
import { ambilDaftarSantri, type Santri } from "@/lib/data/santri";
import { bolehInput, pesanModePantauan } from "@/lib/akses";
import { ambilProfilLogin } from "@/lib/sesi";
import type { Peran } from "@/lib/peran";
import {
  CATATAN_RUMUS_SEMENTARA,
  LABEL_MAPEL_CONTOH,
  LABEL_SEMESTER,
  MAPEL_DINIYYAH_CONTOH,
  SLOT_DINIYYAH,
  ambilNilaiHarianSantri,
  ambilNilaiUjianSantri,
  ambilSemester,
  formatNilai,
  hitungRingkasanMapel,
  simpanNilaiHarian,
  simpanNilaiUjian,
  type NilaiHarian,
  type NilaiUjian,
  type SemesterRef,
} from "@/lib/data/diniyyah";

const GAYA_PILIH: CSSProperties = {
  minHeight: 48,
  padding: "11px 14px",
  fontSize: 15,
  border: "1.5px solid var(--garis)",
  borderRadius: 12,
  background: "var(--permukaan)",
};

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

function tanggalHariIni(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

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

export type TabDiniyyah = "harian" | "ujian" | "ringkasan";

const DAFTAR_TAB_DINIYYAH: {
  kunci: TabDiniyyah;
  label: string;
  href: string;
}[] = [
  { kunci: "harian", label: "Harian", href: "/diniyyah" },
  { kunci: "ujian", label: "Ujian", href: "/diniyyah?tab=ujian" },
  { kunci: "ringkasan", label: "Ringkasan", href: "/diniyyah?tab=ringkasan" },
];

/**
 * Isi halaman Diniyyah. Gerbang peran modul (src/lib/akses.ts)
 * dipasang page.tsx lewat PenjagaModul: halaman ini hanya dirender
 * untuk admin & pengajar diniyyah.
 */
export default function IsiHalamanDiniyyah({ tab }: { tab: TabDiniyyah }) {
  const [semuaSantri, setSemuaSantri] = useState<Santri[]>([]);
  const [daftarSemester, setDaftarSemester] = useState<SemesterRef[]>([]);
  const [sumberContoh, setSumberContoh] = useState(false);
  const [peranMasuk, setPeranMasuk] = useState<Peran | null>(null);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  const [muatSelesai, setMuatSelesai] = useState(false);

  const [santriId, setSantriId] = useState<string>("");
  const [mapel, setMapel] = useState<string>(MAPEL_DINIYYAH_CONTOH[0]);

  // Nilai milik santri terpilih
  const [harian, setHarian] = useState<NilaiHarian[]>([]);
  const [ujian, setUjian] = useState<NilaiUjian[]>([]);

  // Form nilai harian
  const [tanggalHarian, setTanggalHarian] = useState<string>(() =>
    tanggalHariIni(),
  );
  const [nilaiHarianInput, setNilaiHarianInput] = useState<string>("");
  const [pesanHarian, setPesanHarian] = useState<string | null>(null);
  const [simpanHarianBerjalan, setSimpanHarianBerjalan] = useState(false);

  // Form nilai ujian — semester dipilih langsung dari daftar semester
  const [semesterUjianId, setSemesterUjianId] = useState<string>("");
  const [nilaiUjianInput, setNilaiUjianInput] = useState<string>("");
  const [pesanUjian, setPesanUjian] = useState<string | null>(null);
  const [simpanUjianBerjalan, setSimpanUjianBerjalan] = useState(false);

  /* Muat daftar santri + semester sekali; juga target coba lagi. */
  const muatAwal = useCallback(async () => {
    setGalatMuat(null);
    try {
      const [santriHasil, semesterHasil, profilLogin] = await Promise.all([
        ambilDaftarSantri(),
        ambilSemester(),
        ambilProfilLogin(),
      ]);
      setPeranMasuk(profilLogin?.peran ?? null);
      setSemuaSantri(santriHasil.data);
      setDaftarSemester(semesterHasil.data);
      setSumberContoh(santriHasil.sumberContoh || semesterHasil.sumberContoh);
      // Santri TIDAK dipilih otomatis (audit Fase 1): pilihan awal
      // kosong agar nilai tidak berisiko masuk ke anak yang salah.
      // Semester bawaan form ujian (audit Fase 3): semester yang
      // SEDANG BERJALAN menurut tanggal hari ini (rentangnya memuat
      // hari ini), bukan lagi pencarian gasal. Cadangan: semester
      // pertama dari data; kosong tetap kosong (pesan jelas
      // ditampilkan di form ujian — semester tidak dikarang).
      const hariIni = tanggalHariIni();
      const bawaan =
        semesterHasil.data.find(
          (s) =>
            s.tanggalMulai &&
            s.tanggalSelesai &&
            hariIni >= s.tanggalMulai &&
            hariIni <= s.tanggalSelesai,
        ) ?? semesterHasil.data[0];
      if (bawaan) setSemesterUjianId(bawaan.id);
    } catch (e: unknown) {
      setGalatMuat(
        e instanceof Error ? e.message : "Gagal memuat data diniyyah.",
      );
    } finally {
      setMuatSelesai(true);
    }
  }, []);

  useEffect(() => {
    void muatAwal();
  }, [muatAwal]);

  const muatNilai = useCallback(async (id: string) => {
    if (!id) {
      setHarian([]);
      setUjian([]);
      return;
    }
    const [h, u] = await Promise.all([
      ambilNilaiHarianSantri(id),
      ambilNilaiUjianSantri(id),
    ]);
    setHarian(h.data);
    setUjian(u.data);
  }, []);

  useEffect(() => {
    muatNilai(santriId).catch(() => {
      setHarian([]);
      setUjian([]);
    });
  }, [santriId, muatNilai]);

  /* Reset konteks (audit Fase 1): mengganti santri atau mapel
     mengosongkan nilai yang sedang diketik pada KEDUA form, agar
     angka yang dimaksudkan untuk anak/mapel sebelumnya tidak terbawa
     tersimpan ke konteks yang baru. Pesan hasil simpan sebelumnya
     juga dibersihkan karena konteksnya sudah berganti. */
  useEffect(() => {
    setNilaiHarianInput("");
    setNilaiUjianInput("");
    setPesanHarian(null);
    setPesanUjian(null);
  }, [santriId, mapel]);

  const santriTerpilih = useMemo(
    () => semuaSantri.find((s) => s.id === santriId) ?? null,
    [semuaSantri, santriId],
  );

  /* Database asli belum punya satu pun baris semester (mode contoh
     selalu punya semester contoh, jadi keadaan ini khusus mode asli):
     nilai ujian belum bisa diisi sampai admin membuat semester. */
  const semesterBelumAda =
    muatSelesai && !sumberContoh && daftarSemester.length === 0;

  /* Mode pantauan admin: hanya mode Supabase dengan peran admin
     terkonfirmasi — formulir harian & ujian disembunyikan, tab
     Ringkasan dan pemilih santri/mapel tetap tampil. */
  const pantauanAdmin =
    !sumberContoh &&
    peranMasuk !== null &&
    !bolehInput(peranMasuk, "diniyyah");

  const ringkasan = useMemo(
    () => hitungRingkasanMapel(harian, ujian),
    [harian, ujian],
  );

  /* Nilai yang SUDAH tercatat untuk konteks form saat ini (audit
     Fase 3): bila ada, form menampilkan "Nilai saat ini: X" dan
     tombol simpan berubah menjadi "Perbarui nilai" — pengajar
     sadar ia memperbarui catatan yang ada (upsert di lapisan data),
     bukan membuat nilai baru. */
  const nilaiHarianAda = useMemo(
    () =>
      harian.find((n) => n.tanggal === tanggalHarian && n.mapel === mapel) ??
      null,
    [harian, tanggalHarian, mapel],
  );
  const nilaiUjianAda = useMemo(
    () =>
      ujian.find(
        (u) => u.semesterId === semesterUjianId && u.mapel === mapel,
      ) ?? null,
    [ujian, semesterUjianId, mapel],
  );

  async function tanganiSimpanHarian() {
    setPesanHarian(null);
    const nilai = Number(nilaiHarianInput);
    if (!santriId) {
      setPesanHarian("Pilih santri dulu.");
      return;
    }
    if (nilaiHarianInput.trim() === "" || Number.isNaN(nilai)) {
      setPesanHarian("Nilai harian wajib diisi dengan angka 0–100.");
      return;
    }
    if (nilai < 0 || nilai > 100) {
      setPesanHarian("Nilai harian harus antara 0 sampai 100.");
      return;
    }
    setSimpanHarianBerjalan(true);
    try {
      const hasil = await simpanNilaiHarian({
        santriId,
        tanggal: tanggalHarian,
        mapel,
        nilai,
      });
      setPesanHarian(
        `Tersimpan: nilai harian ${mapel} (contoh) untuk ${santriTerpilih?.nama ?? "santri terpilih"} tanggal ${hasil.data.tanggal} = ${formatNilai(hasil.data.nilai)}.` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara di halaman ini.)"
            : ""),
      );
      setNilaiHarianInput("");
      await muatNilai(santriId);
    } catch (e: unknown) {
      setPesanHarian(
        e instanceof Error ? e.message : "Gagal menyimpan nilai harian.",
      );
    } finally {
      setSimpanHarianBerjalan(false);
    }
  }

  async function tanganiSimpanUjian() {
    setPesanUjian(null);
    const nilai = Number(nilaiUjianInput);
    if (!santriId) {
      setPesanUjian("Pilih santri dulu.");
      return;
    }
    if (!semesterUjianId) {
      setPesanUjian(
        sumberContoh
          ? "Daftar semester belum tersedia."
          : "Belum ada semester yang bisa dipilih — semester harus dibuat oleh admin terlebih dahulu.",
      );
      return;
    }
    if (nilaiUjianInput.trim() === "" || Number.isNaN(nilai)) {
      setPesanUjian("Nilai ujian wajib diisi dengan angka 0–100.");
      return;
    }
    if (nilai < 0 || nilai > 100) {
      setPesanUjian("Nilai ujian harus antara 0 sampai 100.");
      return;
    }
    setSimpanUjianBerjalan(true);
    try {
      const hasil = await simpanNilaiUjian({
        santriId,
        semesterId: semesterUjianId,
        mapel,
        nilai,
      });
      setPesanUjian(
        `Tersimpan: nilai ujian ${hasil.data.semesterNama} (${LABEL_SEMESTER[hasil.data.jenisSemester]}) mapel ${mapel} (contoh) untuk ${santriTerpilih?.nama ?? "santri terpilih"} = ${formatNilai(hasil.data.nilai)}.` +
          (hasil.sumberContoh
            ? " (Data contoh — tersimpan sementara di halaman ini.)"
            : ""),
      );
      setNilaiUjianInput("");
      await muatNilai(santriId);
    } catch (e: unknown) {
      setPesanUjian(
        e instanceof Error ? e.message : "Gagal menyimpan nilai ujian.",
      );
    } finally {
      setSimpanUjianBerjalan(false);
    }
  }

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">Diniyyah</h1>
      <p className="subjudul">
        Nilai harian dan nilai ujian semester gasal dan genap beserta
        rata-ratanya.
      </p>
      <p className="catatan-kaki" style={{ marginTop: -10, marginBottom: 16 }}>
        Slot kegiatan: {SLOT_DINIYYAH.join(" · ")}.
      </p>

      {/* Penanda jujur: mapel contoh + rumus sementara. Kini ringkas
          satu baris yang bisa dibuka (audit Fase 3) — transparansi
          dipertahankan, tetapi tidak lagi mendominasi halaman kerja. */}
      <details className="rincian">
        <summary>Konfigurasi akademik belum final</summary>
        <div>
          <p>
            <strong>{LABEL_MAPEL_CONTOH}:</strong> daftar mata pelajaran di
            halaman ini (Nahwu, Shorof, Fiqih, Tauhid) adalah contoh umum
            madrasah, bukan daftar resmi pondok. Daftar resmi mengikuti PDF
            jadwal diniyyah dari user; bila sudah ada, daftar ini diganti dari
            satu konstanta di lapisan data.
          </p>
          <p>
            <strong>Rata-rata masih rumus sementara.</strong>{" "}
            {CATATAN_RUMUS_SEMENTARA}
          </p>
        </div>
      </details>

      {galatMuat && (
        <KartuGalat pesan={galatMuat} onCobaLagi={() => void muatAwal()} />
      )}

      <div role="tablist" aria-label="Bagian diniyyah" className="tab-pil">
        {DAFTAR_TAB_DINIYYAH.map((t) => {
          const aktif = tab === t.kunci;
          return (
            <Link
              key={t.kunci}
              role="tab"
              id={`tab-diniyyah-${t.kunci}`}
              aria-selected={aktif}
              aria-current={aktif ? "page" : undefined}
              aria-controls={`panel-diniyyah-${t.kunci}`}
              href={t.href}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-diniyyah-${tab}`}
        aria-labelledby={`tab-diniyyah-${tab}`}
      >

      {/* ------------ Pilih santri & mapel ------------ */}
      <section className="kartu">
        <h2>Santri & mata pelajaran</h2>
        <div className="formulir" style={{ maxWidth: "100%" }}>
          <label>
            Santri
            <select
              value={santriId}
              onChange={(e) => setSantriId(e.target.value)}
              style={GAYA_PILIH}
            >
              <option value="">
                {semuaSantri.length === 0
                  ? "Belum ada santri"
                  : "Pilih santri…"}
              </option>
              {semuaSantri.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} — Kelas {s.kelasTingkat}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Mata pelajaran (contoh)
            </span>
            <div className="grup-chip" role="group" aria-label="Mata pelajaran">
              {MAPEL_DINIYYAH_CONTOH.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="chip"
                  aria-pressed={mapel === m}
                  onClick={() => setMapel(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------ Form nilai harian ------------ */}
      {tab === "harian" && (
      <section className="kartu">
        <h2>Form nilai harian</h2>
        <p>
          Satu nilai per santri per tanggal per mapel; mengisi ulang
          tanggal+mapel yang sama memperbarui nilainya.
        </p>
        {pantauanAdmin ? (
          <p className="catatan-pantauan" role="note">
            {pesanModePantauan("pengajar diniyyah")}
          </p>
        ) : (
        <div className="formulir" style={{ maxWidth: "100%" }}>
          <label>
            Tanggal
            <input
              type="date"
              value={tanggalHarian}
              onChange={(e) => setTanggalHarian(e.target.value)}
            />
          </label>
          <label>
            Mapel terpilih: <LabelMapel mapel={mapel} />
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              inputMode="decimal"
              placeholder="Nilai 0–100"
              value={nilaiHarianInput}
              onChange={(e) => setNilaiHarianInput(e.target.value)}
            />
          </label>
          {nilaiHarianAda && (
            <p className="catatan-kaki" style={{ margin: 0 }} aria-live="polite">
              Nilai saat ini:{" "}
              <strong>{formatNilai(nilaiHarianAda.nilai)}</strong> — sudah
              ada nilai {mapel} untuk tanggal {tanggalHarian}; menyimpan
              akan memperbaruinya.
            </p>
          )}
          <p className="catatan-kaki" style={{ margin: 0 }}>
            {santriTerpilih ? (
              <>
                Santri terpilih:{" "}
                <strong>
                  {santriTerpilih.nama} — Kelas {santriTerpilih.kelasTingkat}
                </strong>
              </>
            ) : (
              "Pilih santri terlebih dahulu — nilai tidak akan tersimpan sebelum santri dipilih."
            )}
          </p>
          <button
            type="button"
            className="tombol"
            onClick={tanganiSimpanHarian}
            disabled={simpanHarianBerjalan || !santriId}
          >
            {simpanHarianBerjalan
              ? "Menyimpan…"
              : nilaiHarianAda
                ? "Perbarui nilai"
                : "Simpan nilai harian"}
          </button>
        </div>
        )}
        {pesanHarian && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
            {pesanHarian}
          </p>
        )}
      </section>

      )}

      {/* ------------ Form nilai ujian ------------ */}
      {tab === "ujian" && (
      <section className="kartu">
        <h2>Form nilai ujian semester</h2>
        <p>
          Nilai ujian per mapel untuk semester gasal atau genap
          {santriTerpilih ? ` — santri: ${santriTerpilih.nama}` : ""}.
        </p>
        {semesterBelumAda && (
          <p>
            <strong>Belum ada data semester.</strong> Semester gasal/genap
            harus dibuat oleh admin terlebih dahulu — selama belum ada,
            nilai ujian belum bisa diisi. Nilai harian di atas tetap bisa
            diisi seperti biasa.
          </p>
        )}
        {pantauanAdmin ? (
          <p className="catatan-pantauan" role="note">
            {pesanModePantauan("pengajar diniyyah")}
          </p>
        ) : (
        <div className="formulir" style={{ maxWidth: "100%" }}>
          <label>
            Semester
            <select
              value={semesterUjianId}
              onChange={(e) => setSemesterUjianId(e.target.value)}
              style={GAYA_PILIH}
              disabled={daftarSemester.length === 0}
            >
              {daftarSemester.length === 0 && (
                <option value="">Belum ada semester</option>
              )}
              {daftarSemester.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} — {s.tahunAjaran} ({LABEL_SEMESTER[s.jenis]})
                </option>
              ))}
            </select>
          </label>
          <label>
            Mapel terpilih: <LabelMapel mapel={mapel} />
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              inputMode="decimal"
              placeholder="Nilai 0–100"
              value={nilaiUjianInput}
              onChange={(e) => setNilaiUjianInput(e.target.value)}
              disabled={daftarSemester.length === 0}
            />
          </label>
          {nilaiUjianAda && (
            <p className="catatan-kaki" style={{ margin: 0 }} aria-live="polite">
              Nilai saat ini:{" "}
              <strong>{formatNilai(nilaiUjianAda.nilai)}</strong> — sudah
              ada nilai ujian {mapel} untuk semester ini (
              {nilaiUjianAda.semesterNama}); menyimpan akan
              memperbaruinya.
            </p>
          )}
          <p className="catatan-kaki" style={{ margin: 0 }}>
            {santriTerpilih ? (
              <>
                Santri terpilih:{" "}
                <strong>
                  {santriTerpilih.nama} — Kelas {santriTerpilih.kelasTingkat}
                </strong>
              </>
            ) : (
              "Pilih santri terlebih dahulu — nilai tidak akan tersimpan sebelum santri dipilih."
            )}
          </p>
          <button
            type="button"
            className="tombol"
            onClick={tanganiSimpanUjian}
            disabled={simpanUjianBerjalan || !santriId || !semesterUjianId}
          >
            {simpanUjianBerjalan
              ? "Menyimpan…"
              : nilaiUjianAda
                ? "Perbarui nilai"
                : "Simpan nilai ujian"}
          </button>
        </div>
        )}
        {pesanUjian && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
            {pesanUjian}
          </p>
        )}
      </section>

      )}

      {/* ------------ Tabel ringkasan per mapel ------------ */}
      {tab === "ringkasan" && (
      <section className="kartu">
        <h2>
          Nilai {santriTerpilih ? santriTerpilih.nama : "—"} per mapel
        </h2>
        <p>
          Kolom rata-rata memakai <strong>rumus sementara</strong> (rata-rata
          sederhana). {CATATAN_RUMUS_SEMENTARA}
        </p>
        <div className="tabel-bungkus">
          <table
            style={{ width: "100%", borderCollapse: "collapse" }}
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
              {ringkasan.map((r) => (
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
                  <td style={GAYA_SEL_ANGKA}>{formatNilai(r.ujianGasal)}</td>
                  <td style={GAYA_SEL_ANGKA}>{formatNilai(r.ujianGenap)}</td>
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
        {harian.length === 0 ? (
          <p>Belum ada nilai harian untuk santri ini.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {harian.slice(0, 10).map((n) => (
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
                  {n.tanggal} · <LabelMapel mapel={n.mapel} />
                </span>
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatNilai(n.nilai)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>
      )}
      </div>
    </>
  );
}
