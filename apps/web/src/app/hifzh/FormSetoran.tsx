"use client";

/**
 * Form Setoran Buku Hafalan — 8 kolom resmi (ABU_SABIQ_1.pdf):
 *   1 tanggal (Hijriah, Masehi tersimpan) · 2 jenis BC/BR/TS/LM ·
 *   3 halaman · 4 surat dan ayat · 5 kesalahan RG/KK/KB + rincian ·
 *   6 nilai L/U · 7 paraf penyimak · 8 tugas berikutnya.
 *
 * Nilai (kolom 6) TIDAK diisi manual: dihitung LIVE oleh fungsi resmi
 * di src/lib/hifzh.ts dan ditampilkan sebagai pratinjau sebelum kirim.
 * Paraf (kolom 7) TERKUNCI pada nama akun yang masuk.
 *
 * Perapian audit visual user (4 Nov 2026) — halaman ini acuan desain:
 * - Alur pencatatan mobile: santri → tanggal & jenis → surat/ayat →
 *   kesalahan → catatan & tugas; tanggal Hijriah menjadi info
 *   pendamping tanggal, bukan kolom besar.
 * - Jenis hafalan memakai chip singkat BC/BR/TS/LM; arti pilihan
 *   aktif tampil di bawahnya.
 * - RG/KK/KB memakai kontrol tambah/kurang (angka tetap bisa
 *   diketik); penjelasan & aturan nilai pindah ke panel "Lihat
 *   aturan penilaian" yang bisa dibuka.
 * - Desktop: formulir di kiri, panel ringkasan (hasil penilaian,
 *   aturan, penyimak ringkas) di kanan (.tata-form-hifzh).
 * - Tombol Simpan pada bilah melekat (.bilah-simpan) dengan
 *   ringkasan santri terpilih, mudah dijangkau di HP.
 */
import { useMemo, useState } from "react";
import { Ikon } from "@/components/Ikon";
import AvatarInisial from "@/components/AvatarInisial";
import {
  LABEL_JENIS_SETORAN,
  LABEL_NILAI_SETORAN,
  SEMUA_JENIS_SETORAN,
  nilaiSetoran,
  rincianKonversi,
  type JenisSetoran,
} from "@/lib/hifzh";
import {
  simpanSetoran,
  type SantriRingkas,
  type SetoranHifzh,
  type SumberData,
} from "@/lib/data/hifzh";
import { formatHijriahLengkap } from "@/lib/tanggal";
import { gayaLabel, gayaMasukan } from "./gaya";

interface PropertiFormSetoran {
  daftarSantri: SantriRingkas[];
  /** Nama akun yang masuk — menjadi paraf, terkunci, tidak bisa diubah. */
  namaPenyimak: string;
  /** Label peran akun yang masuk, mis. "Pengajar Hifzh". */
  labelPeranPenyimak: string;
  sumber: SumberData;
  onTerkirim: (setoran: SetoranHifzh) => void;
}

function tanggalHariIni(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Format Hijriah dari tanggal Masehi — memakai helper bersama
 * lib/tanggal.ts: nama bulan dipetakan sendiri dari bagian ANGKA
 * Intl, karena month long kalender Islam terbukti mengembalikan
 * nama bulan Masehi yang salah di sebagian perangkat (kasus user
 * 4 Nov 2026). Nilai inilah yang DISIMPAN sebagai tanggal_hijriah
 * setoran, jadi kebenarannya penting.
 */
export function formatHijriah(tanggalMasehi: string): string {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggalMasehi);
  if (!cocok) return "—";
  const tanggal = new Date(
    Number(cocok[1]),
    Number(cocok[2]) - 1,
    Number(cocok[3]),
    12, // tengah hari setempat, menghindari geser hari karena zona waktu
  );
  return formatHijriahLengkap(tanggal) || "—";
}

function keAngka(teks: string): number {
  const n = Number.parseInt(teks, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Nama pendek jenis setoran untuk tombol pilihan (baris pertama);
 *  keterangan resminya menjadi baris kedua tombol. */
const NAMA_JENIS_PENDEK: Record<JenisSetoran, string> = {
  BC: "Membaca",
  BR: "Hafalan baru",
  TS: "Tes hafalan",
  LM: "Hafalan lama",
};

/**
 * Baris penilaian prototipe: label + keterangan resmi di kiri,
 * kontrol tambah/kurang di kanan (angka tetap bisa diketik).
 */
function StepperKesalahan({
  label,
  keterangan,
  nilai,
  onUbah,
}: {
  label: string;
  keterangan: string;
  nilai: string;
  onUbah: (teks: string) => void;
}) {
  const n = keAngka(nilai);
  return (
    <div className="baris-penilaian">
      <span className="penilaian-teks">
        <span className="penilaian-label">{label}</span>
        <span className="penilaian-ket">{keterangan}</span>
      </span>
      <span className="stepper">
        <button
          type="button"
          aria-label={`Kurangi ${label}`}
          disabled={n <= 0}
          onClick={() => onUbah(String(Math.max(0, n - 1)))}
        >
          −
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={nilai}
          onChange={(e) => onUbah(e.target.value)}
          style={gayaMasukan}
          aria-label={`Jumlah ${label}`}
        />
        <button
          type="button"
          aria-label={`Tambah ${label}`}
          onClick={() => onUbah(String(n + 1))}
        >
          +
        </button>
      </span>
    </div>
  );
}

export default function FormSetoran({
  daftarSantri,
  namaPenyimak,
  labelPeranPenyimak,
  sumber,
  onTerkirim,
}: PropertiFormSetoran) {
  const [santriId, setSantriId] = useState("");
  const [tanggalMasehi, setTanggalMasehi] = useState(tanggalHariIni());
  const [jenis, setJenis] = useState<JenisSetoran>("BR");
  const [halaman, setHalaman] = useState("");
  const [surat, setSurat] = useState("");
  const [ayatDari, setAyatDari] = useState("");
  const [ayatSampai, setAyatSampai] = useState("");
  const [rg, setRg] = useState("0");
  const [kk, setKk] = useState("0");
  const [kb, setKb] = useState("0");
  const [catatanRincian, setCatatanRincian] = useState("");
  const [tugasBerikutnya, setTugasBerikutnya] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);
  const [ralat, setRalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  const tanggalHijriah = useMemo(
    () => formatHijriah(tanggalMasehi),
    [tanggalMasehi],
  );

  // Pratinjau nilai LIVE — fungsi yang sama dengan pemicu database.
  const rgN = keAngka(rg);
  const kkN = keAngka(kk);
  const kbN = keAngka(kb);
  const rincian = rincianKonversi(rgN, kkN, kbN);
  const nilaiLive = nilaiSetoran(jenis, rgN, kkN, kbN);

  // Santri TIDAK dipilih otomatis (audit Fase 1): tanpa pilihan sadar
  // dari pengguna, santriTerpilih null dan tombol Simpan nonaktif —
  // setoran tidak boleh berisiko masuk ke anak yang salah. (Setelah
  // pengguna memilih dan menyimpan, pilihan dipertahankan untuk
  // setoran berikutnya pada anak yang sama.)
  const santriTerpilih = daftarSantri.find((s) => s.id === santriId) ?? null;

  async function tanganiKirim(e: React.FormEvent) {
    e.preventDefault();
    setRalat(null);
    setPesan(null);

    if (!santriTerpilih) {
      setRalat("Pilih santri dulu sebelum menyimpan setoran.");
      return;
    }
    const halamanN = keAngka(halaman);
    const ayatDariN = keAngka(ayatDari);
    const ayatSampaiN = keAngka(ayatSampai);
    if (halamanN < 1) {
      setRalat("Halaman harus diisi (angka mulai dari 1).");
      return;
    }
    if (!surat.trim()) {
      setRalat("Surat harus diisi.");
      return;
    }
    if (ayatDariN < 1 || ayatSampaiN < ayatDariN) {
      setRalat(
        "Ayat harus benar: ayat dari mulai 1 dan ayat sampai tidak boleh lebih kecil.",
      );
      return;
    }

    const masukan = {
      santriId: santriTerpilih.id,
      tanggalMasehi,
      tanggalHijriah,
      jenis,
      halaman: halamanN,
      surat: surat.trim(),
      ayatDari: ayatDariN,
      ayatSampai: ayatSampaiN,
      rg: Math.max(0, rgN),
      kk: Math.max(0, kkN),
      kb: Math.max(0, kbN),
      catatanRincian: catatanRincian.trim() || null,
      tugasBerikutnya: tugasBerikutnya.trim() || null,
    };

    setMengirim(true);
    try {
      const hasil = await simpanSetoran(masukan);
      onTerkirim({
        id: `lokal-${Date.now()}`,
        santriId: masukan.santriId,
        santriNama: santriTerpilih.nama,
        tanggalMasehi: masukan.tanggalMasehi,
        tanggalHijriah: masukan.tanggalHijriah,
        jenis: masukan.jenis,
        halaman: masukan.halaman,
        surat: masukan.surat,
        ayatDari: masukan.ayatDari,
        ayatSampai: masukan.ayatSampai,
        rg: masukan.rg,
        kk: masukan.kk,
        kb: masukan.kb,
        catatanRincian: masukan.catatanRincian,
        nilaiHuruf: nilaiSetoran(
          masukan.jenis,
          masukan.rg,
          masukan.kk,
          masukan.kb,
        ),
        penyimakId: null,
        penyimakNama: namaPenyimak,
        tugasBerikutnya: masukan.tugasBerikutnya,
      });
      setPesan(
        hasil.tersimpanKeDatabase
          ? "Setoran tersimpan ke database."
          : "Setoran ditambahkan ke daftar di halaman ini sebagai CONTOH (belum masuk database — env Supabase belum terisi).",
      );
      // Siapkan form untuk setoran berikutnya; santri & tanggal dipertahankan.
      setHalaman("");
      setSurat("");
      setAyatDari("");
      setAyatSampai("");
      setRg("0");
      setKk("0");
      setKb("0");
      setCatatanRincian("");
      setTugasBerikutnya("");
    } catch (err) {
      setRalat(
        err instanceof Error
          ? `Gagal menyimpan: ${err.message}`
          : "Gagal menyimpan setoran.",
      );
    } finally {
      setMengirim(false);
    }
  }

  return (
    <form
      onSubmit={tanganiKirim}
      className="form-setoran"
      aria-label="Form setoran hafalan"
    >
      <div className="tata-form-hifzh">
        <div className="kolom-form-utama">
          <section className="form-seksi">
            <div className="form-seksi-kepala">
              <span className="nomor-seksi">01</span>
              <div>
                <h3>Konteks setoran</h3>
                <p>Tentukan santri dan tanggal pencatatan.</p>
              </div>
            </div>
            <div className="form-konteks">
              <label style={gayaLabel}>
                Santri <span className="wajib-sr">(wajib)</span>
                <select
                  value={santriId}
                  onChange={(e) => setSantriId(e.target.value)}
                  style={gayaMasukan}
                  required
                >
                  <option value="">
                    {daftarSantri.length === 0
                      ? "Belum ada santri"
                      : "Pilih santri…"}
                  </option>
                  {daftarSantri.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                      {s.kelasTingkat ? ` — Kelas ${s.kelasTingkat}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label style={gayaLabel}>
                Tanggal
                <input
                  type="date"
                  value={tanggalMasehi}
                  onChange={(e) => setTanggalMasehi(e.target.value)}
                  style={gayaMasukan}
                  required
                />
                <span className="petunjuk-kolom">{tanggalHijriah}</span>
              </label>
            </div>
          </section>

          <section className="form-seksi">
            <div className="form-seksi-kepala">
              <span className="nomor-seksi">02</span>
              <div>
                <h3>Materi hafalan</h3>
                <p>Pilih jenis dan bagian yang disetorkan.</p>
              </div>
            </div>
            <fieldset className="jenis-fieldset">
              <legend>Jenis hafalan</legend>
              <div className="pilihan-jenis">
                {SEMUA_JENIS_SETORAN.map((j) => (
                  <label
                    key={j}
                    className={`pilihan-jenis-item${jenis === j ? " pilihan-jenis-item--aktif" : ""}`}
                  >
                    <input
                      type="radio"
                      name="jenis-hafalan"
                      value={j}
                      checked={jenis === j}
                      onChange={() => setJenis(j)}
                      aria-describedby="jenis-hafalan-bantuan"
                    />
                    <span className="jenis-kode">{j}</span>
                    <span className="jenis-judul">{NAMA_JENIS_PENDEK[j]}</span>
                    {jenis === j && (
                      <span className="jenis-centang">
                        <Ikon nama="centang" ukuran={13} />
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <p
                id="jenis-hafalan-bantuan"
                className="petunjuk-kolom jenis-bantuan"
              >
                {LABEL_JENIS_SETORAN[jenis].replace(/^[A-Z]{2} — /, "")}
              </p>
            </fieldset>
            <div className="form-materi">
              <label style={gayaLabel} className="kolom-surat">
                Surat
                <input
                  type="text"
                  value={surat}
                  onChange={(e) => setSurat(e.target.value)}
                  style={gayaMasukan}
                  placeholder="Contoh: Al-Kahf"
                  required
                />
              </label>
              <label style={gayaLabel}>
                Halaman
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={halaman}
                  onChange={(e) => setHalaman(e.target.value)}
                  style={gayaMasukan}
                  placeholder="214"
                  required
                />
              </label>
              <label style={gayaLabel}>
                Ayat dari
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={ayatDari}
                  onChange={(e) => setAyatDari(e.target.value)}
                  style={gayaMasukan}
                  placeholder="1"
                  required
                />
              </label>
              <label style={gayaLabel}>
                Ayat sampai
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={ayatSampai}
                  onChange={(e) => setAyatSampai(e.target.value)}
                  style={gayaMasukan}
                  placeholder="10"
                  required
                />
              </label>
            </div>
          </section>

          <section className="form-seksi">
            <div className="form-seksi-kepala">
              <span className="nomor-seksi">03</span>
              <div>
                <h3>Penilaian</h3>
                <p>Catat kesalahan; nilai dihitung otomatis.</p>
              </div>
            </div>
            <div className="kartu-penilaian">
              <StepperKesalahan
                label="RG · Ragu"
                keterangan="Mandiri atau diingatkan 1×"
                nilai={rg}
                onUbah={setRg}
              />
              <StepperKesalahan
                label="KK · Kesalahan kecil"
                keterangan="Diingatkan minimal 2×"
                nilai={kk}
                onUbah={setKk}
              />
              <StepperKesalahan
                label="KB · Kesalahan besar"
                keterangan="Belum membaik setelah 3×"
                nilai={kb}
                onUbah={setKb}
              />
            </div>
          </section>

          <details className="form-tambahan">
            <summary>
              <span>
                <Ikon nama="pena" ukuran={17} />
                Catatan dan tugas berikutnya
              </span>
              <span className="label-opsional">Opsional</span>
            </summary>
            <div className="form-tambahan-isi">
              <label style={gayaLabel}>
                Rincian kesalahan
                <textarea
                  value={catatanRincian}
                  onChange={(e) => setCatatanRincian(e.target.value)}
                  style={{ ...gayaMasukan, minHeight: 84, resize: "vertical" }}
                  placeholder="Nomor ayat dan lafazh yang perlu diperbaiki…"
                />
              </label>
              <label style={gayaLabel}>
                Tugas berikutnya
                <input
                  type="text"
                  value={tugasBerikutnya}
                  onChange={(e) => setTugasBerikutnya(e.target.value)}
                  style={gayaMasukan}
                  placeholder="Hafalan untuk setoran berikutnya"
                />
              </label>
            </div>
          </details>
        </div>

        <aside className="kolom-samping-form" aria-label="Ringkasan setoran">
          <section className="kartu-samping ringkasan-setoran">
            <span className="label-ringkasan">RINGKASAN SETORAN</span>
            <div className="santri-ringkasan">
              {santriTerpilih ? (
                <AvatarInisial nama={santriTerpilih.nama} ukuran="kecil" />
              ) : (
                <span className="santri-kosong-ikon">
                  <Ikon nama="santri" ukuran={22} />
                </span>
              )}
              <div>
                <strong>
                  {santriTerpilih?.nama ?? "Belum memilih santri"}
                </strong>
                <span>
                  {santriTerpilih?.kelasTingkat
                    ? `Kelas ${santriTerpilih.kelasTingkat}`
                    : "Pilih santri pada formulir"}
                </span>
              </div>
            </div>
            <div className="ringkas-materi">
              <span>Jenis setoran</span>
              <strong>
                {jenis} · {NAMA_JENIS_PENDEK[jenis]}
              </strong>
              <span>Materi</span>
              <strong>
                {surat.trim()
                  ? `${surat}${ayatDari ? ` ${ayatDari}${ayatSampai ? `–${ayatSampai}` : ""}` : ""}`
                  : "Belum diisi"}
              </strong>
            </div>
            <div
              className={`hasil-setoran hasil-setoran--${nilaiLive.toLowerCase()}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <span>Pratinjau nilai</span>
              <strong>
                {nilaiLive}
                <span>{LABEL_NILAI_SETORAN[nilaiLive]}</span>
              </strong>
              <p>
                {jenis === "BR" || jenis === "TS"
                  ? "Lancar bila RG, KK, dan KB semuanya 0."
                  : `KB konversi ${rincian.kbTotal} · Lancar bila tidak lebih dari 3.`}
              </p>
            </div>
            <div className="penyimak-ringkasan">
              <Ikon nama="perisai" ukuran={16} />
              <span>
                Dicatat oleh<strong>{namaPenyimak}</strong>
                <small>{labelPeranPenyimak}</small>
              </span>
            </div>
          </section>
          <details className="bantuan-penilaian">
            <summary>
              <Ikon nama="hifzh" ukuran={16} />
              Panduan penilaian
            </summary>
            <div>
              <p>
                RG: ragu, membaik sendiri atau diingatkan 1×. KK: membaik
                setelah diingatkan minimal 2×. KB: belum membaik setelah
                diingatkan 3×.
              </p>
              <p>Konversi: 3 RG = 1 KK; 3 KK = 1 KB.</p>
              <p>
                BR/TS: Lancar jika semua kesalahan 0. BC/LM: Lancar jika KB
                hasil konversi ≤ 3.
              </p>
            </div>
          </details>
        </aside>
      </div>

      {ralat && (
        <p role="alert" className="pesan-galat pesan-form">
          {ralat}
        </p>
      )}
      {pesan && (
        <p role="status" className="pesan-sukses pesan-form">
          {pesan}
        </p>
      )}
      {sumber === "contoh" && (
        <p className="petunjuk-kolom pesan-form">
          Mode contoh: pencatatan sementara untuk mencoba formulir.
        </p>
      )}

      <div className="bilah-simpan">
        <div className="bilah-simpan-dalam">
          <div className="ringkas-simpan">
            <strong>
              {santriTerpilih?.nama ?? "Pilih santri untuk mulai"}
            </strong>
            <span>
              {santriTerpilih
                ? `${jenis} · Pratinjau ${LABEL_NILAI_SETORAN[nilaiLive]}`
                : "Setoran akan tercatat atas akun Anda"}
            </span>
          </div>
          <button
            type="submit"
            className="tombol"
            disabled={mengirim || !santriTerpilih}
          >
            <Ikon nama={mengirim ? "jam" : "centang"} ukuran={17} />
            {mengirim ? "Menyimpan…" : "Simpan setoran"}
          </button>
        </div>
      </div>
    </form>
  );
}
