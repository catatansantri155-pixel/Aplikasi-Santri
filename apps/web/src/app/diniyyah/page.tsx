"use client";

/**
 * Halaman Diniyyah — Jalur E, Tahap 2.
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
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import PenandaTahap from "@/components/PenandaTahap";
import PenjagaModul from "@/components/PenjagaModul";
import { ambilDaftarSantri, type Santri } from "@/lib/data/santri";
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
  padding: "8px 10px",
  borderBottom: "1px solid var(--garis)",
  fontSize: 14,
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

/**
 * Gerbang peran modul (src/lib/akses.ts): halaman Diniyyah hanya
 * dirender untuk admin & pengajar diniyyah; peran lain menerima pesan
 * penolakan dari PenjagaModul dan form nilai tidak dirender.
 */
export default function HalamanDiniyyah() {
  return (
    <PenjagaModul modul="diniyyah">
      <IsiHalamanDiniyyah />
    </PenjagaModul>
  );
}

function IsiHalamanDiniyyah() {
  const [semuaSantri, setSemuaSantri] = useState<Santri[]>([]);
  const [daftarSemester, setDaftarSemester] = useState<SemesterRef[]>([]);
  const [sumberContoh, setSumberContoh] = useState(false);
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

  /* Muat daftar santri + semester sekali. */
  useEffect(() => {
    let aktif = true;
    Promise.all([ambilDaftarSantri(), ambilSemester()])
      .then(([santriHasil, semesterHasil]) => {
        if (!aktif) return;
        setSemuaSantri(santriHasil.data);
        setDaftarSemester(semesterHasil.data);
        setSumberContoh(santriHasil.sumberContoh || semesterHasil.sumberContoh);
        if (santriHasil.data.length > 0) setSantriId(santriHasil.data[0].id);
        // Semester bawaan form ujian: gasal bila ada, kalau tidak
        // semester pertama dari data; kosong tetap kosong (pesan jelas
        // ditampilkan di form ujian — semester tidak dikarang).
        const bawaan =
          semesterHasil.data.find((s) => s.jenis === "gasal") ??
          semesterHasil.data[0];
        if (bawaan) setSemesterUjianId(bawaan.id);
        setMuatSelesai(true);
      })
      .catch((e: unknown) => {
        if (!aktif) return;
        setGalatMuat(
          e instanceof Error ? e.message : "Gagal memuat data diniyyah.",
        );
        setMuatSelesai(true);
      });
    return () => {
      aktif = false;
    };
  }, []);

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

  const santriTerpilih = useMemo(
    () => semuaSantri.find((s) => s.id === santriId) ?? null,
    [semuaSantri, santriId],
  );

  /* Database asli belum punya satu pun baris semester (mode contoh
     selalu punya semester contoh, jadi keadaan ini khusus mode asli):
     nilai ujian belum bisa diisi sampai admin membuat semester. */
  const semesterBelumAda =
    muatSelesai && !sumberContoh && daftarSemester.length === 0;

  const ringkasan = useMemo(
    () => hitungRingkasanMapel(harian, ujian),
    [harian, ujian],
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
        Nilai harian dan nilai ujian semester gasal/genap beserta rata-rata.
        Slot kegiatan diniyyah: {SLOT_DINIYYAH.join(" · ")}.
      </p>

      {/* Penanda jujur: mapel contoh + rumus sementara */}
      <section className="kartu">
        <h2>Yang belum final pada modul ini</h2>
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
      </section>

      {galatMuat && (
        <section className="kartu">
          <h2>Data belum bisa dimuat</h2>
          <p>{galatMuat}</p>
        </section>
      )}

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
              {semuaSantri.length === 0 && (
                <option value="">Belum ada santri</option>
              )}
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
      <section className="kartu">
        <h2>Form nilai harian</h2>
        <p>
          Satu nilai per santri per tanggal per mapel; mengisi ulang
          tanggal+mapel yang sama memperbarui nilainya.
        </p>
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
          <button
            type="button"
            className="tombol"
            onClick={tanganiSimpanHarian}
            disabled={simpanHarianBerjalan || !santriId}
          >
            {simpanHarianBerjalan ? "Menyimpan…" : "Simpan nilai harian"}
          </button>
        </div>
        {pesanHarian && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
            {pesanHarian}
          </p>
        )}
      </section>

      {/* ------------ Form nilai ujian ------------ */}
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
          <button
            type="button"
            className="tombol"
            onClick={tanganiSimpanUjian}
            disabled={simpanUjianBerjalan || !santriId || !semesterUjianId}
          >
            {simpanUjianBerjalan ? "Menyimpan…" : "Simpan nilai ujian"}
          </button>
        </div>
        {pesanUjian && (
          <p className="catatan-kaki" role="status" style={{ marginTop: 10 }}>
            {pesanUjian}
          </p>
        )}
      </section>

      {/* ------------ Tabel ringkasan per mapel ------------ */}
      <section className="kartu">
        <h2>
          Nilai {santriTerpilih ? santriTerpilih.nama : "—"} per mapel
        </h2>
        <p>
          Kolom rata-rata memakai <strong>rumus sementara</strong> (rata-rata
          sederhana). {CATATAN_RUMUS_SEMENTARA}
        </p>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}
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
    </>
  );
}
