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
import {
  gayaKisiDua,
  gayaLabel,
  gayaLencanaNilai,
  gayaMasukan,
  gayaPetunjuk,
} from "./gaya";

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

/** Kontrol tambah/kurang untuk jumlah kesalahan RG/KK/KB. */
function StepperKesalahan({
  label,
  nilai,
  onUbah,
}: {
  label: string;
  nilai: string;
  onUbah: (teks: string) => void;
}) {
  const n = keAngka(nilai);
  return (
    <label style={gayaLabel}>
      {label}
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
    </label>
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
  const santriTerpilih =
    daftarSantri.find((s) => s.id === santriId) ?? null;

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
      setRalat("Ayat harus benar: ayat dari mulai 1 dan ayat sampai tidak boleh lebih kecil.");
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
        nilaiHuruf: nilaiSetoran(masukan.jenis, masukan.rg, masukan.kk, masukan.kb),
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
    <form onSubmit={tanganiKirim}>
      <div className="tata-form-hifzh">
        <div className="kolom-form-utama">
          <label style={gayaLabel}>
            Santri
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
            <span style={gayaPetunjuk}>{tanggalHijriah} (Hijriah)</span>
          </label>

          <div>
            <span
              style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}
            >
              Jenis hafalan
            </span>
            <div className="grup-chip" role="radiogroup" aria-label="Jenis hafalan">
              {SEMUA_JENIS_SETORAN.map((j) => (
                <button
                  key={j}
                  type="button"
                  role="radio"
                  aria-checked={jenis === j}
                  aria-pressed={jenis === j}
                  className="chip"
                  onClick={() => setJenis(j)}
                >
                  {j}
                </button>
              ))}
            </div>
            <p style={{ ...gayaPetunjuk, marginTop: 8 }}>
              {LABEL_JENIS_SETORAN[jenis]}
            </p>
          </div>

          <div style={gayaKisiDua}>
            <label style={gayaLabel}>
              Halaman
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={halaman}
                onChange={(e) => setHalaman(e.target.value)}
                style={gayaMasukan}
                placeholder="mis. 214"
                required
              />
            </label>
            <label style={gayaLabel}>
              Surat
              <input
                type="text"
                value={surat}
                onChange={(e) => setSurat(e.target.value)}
                style={gayaMasukan}
                placeholder="mis. Al-Kahf"
                required
              />
            </label>
          </div>

          <div style={gayaKisiDua}>
            <label style={gayaLabel}>
              Ayat dari
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={ayatDari}
                onChange={(e) => setAyatDari(e.target.value)}
                style={gayaMasukan}
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
                required
              />
            </label>
          </div>

          <fieldset style={{ border: "1px solid var(--garis)", borderRadius: 12, padding: 12, margin: 0 }}>
            <legend style={{ fontSize: 14, fontWeight: 600, padding: "0 6px" }}>
              Kesalahan
            </legend>
            <div className="kisi-kesalahan">
              <StepperKesalahan label="RG" nilai={rg} onUbah={setRg} />
              <StepperKesalahan label="KK" nilai={kk} onUbah={setKk} />
              <StepperKesalahan label="KB" nilai={kb} onUbah={setKb} />
            </div>
            <label style={{ ...gayaLabel, marginTop: 12 }}>
              Catatan hafalan — rincian kesalahan (nomor ayat &amp; lafazh)
              <textarea
                value={catatanRincian}
                onChange={(e) => setCatatanRincian(e.target.value)}
                style={{ ...gayaMasukan, minHeight: 64, resize: "vertical" }}
                placeholder="mis. Ayat 47: lafazh …"
              />
            </label>
          </fieldset>

          <label style={gayaLabel}>
            Tugas berikutnya
            <input
              type="text"
              value={tugasBerikutnya}
              onChange={(e) => setTugasBerikutnya(e.target.value)}
              style={gayaMasukan}
              placeholder="Hafalan yang disiapkan untuk setoran selanjutnya"
            />
          </label>
        </div>

        <aside className="kolom-samping-form">
          <div className="kartu-samping" aria-live="polite">
            <h3>Hasil penilaian</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ ...gayaLencanaNilai(nilaiLive), fontSize: 15, padding: "4px 14px" }}>
                {nilaiLive} — {LABEL_NILAI_SETORAN[nilaiLive]}
              </span>
            </div>
            <p style={{ ...gayaPetunjuk, marginTop: 8 }}>
              {jenis === "BR" || jenis === "TS"
                ? "BR/TS: L hanya bila RG, KK, KB semuanya 0."
                : `KB hasil konversi: ${rincian.kbTotal} (KK total ${rincian.kkTotal}) — L bila KB konversi ≤ 3.`}
            </p>
          </div>

          <details className="rincian" style={{ margin: 0 }}>
            <summary>Lihat aturan penilaian</summary>
            <div>
              <p>
                <strong>RG</strong> = ragu (membaik sendiri / diingatkan
                1x) · <strong>KK</strong> = kesalahan kecil (membaik
                setelah diingatkan minimal 2x) · <strong>KB</strong> =
                kesalahan besar (tidak membaik setelah diingatkan 3x).
              </p>
              <p>
                Konversi bertahap: 3 RG = 1 KK, 3 KK = 1 KB. Nilai BR
                dan TS: L (Lancar) hanya bila RG, KK, KB semuanya 0,
                selain itu U (Ulang). Nilai BC dan LM: L bila KB hasil
                konversi ≤ 3.
              </p>
            </div>
          </details>

          <div className="kartu-samping">
            <h3>Penyimak</h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              {namaPenyimak} — {labelPeranPenyimak}
            </p>
            <p style={{ ...gayaPetunjuk, marginTop: 4 }}>
              Paraf tercatat otomatis dari akun yang masuk.
            </p>
          </div>
        </aside>
      </div>

      {ralat && (
        <p role="alert" style={{ margin: "12px 0 0", color: "#8e2f24", fontSize: 14 }}>
          {ralat}
        </p>
      )}
      {pesan && (
        <p role="status" style={{ margin: "12px 0 0", color: "var(--hijau-gelap)", fontSize: 14 }}>
          {pesan}
        </p>
      )}
      {sumber === "contoh" && (
        <p style={{ ...gayaPetunjuk, marginTop: 12 }}>
          Mode data contoh: setoran yang dikirim hanya tampil di daftar
          halaman ini, tidak tersimpan ke mana pun.
        </p>
      )}

      <div className="bilah-simpan">
        <span className="ringkas-simpan">
          {santriTerpilih ? (
            <>
              Setoran untuk{" "}
              <strong>
                {santriTerpilih.nama}
                {santriTerpilih.kelasTingkat
                  ? ` · Kelas ${santriTerpilih.kelasTingkat}`
                  : ""}
              </strong>
            </>
          ) : (
            "Pilih santri terlebih dahulu"
          )}
        </span>
        <button
          type="submit"
          className="tombol tombol-besar"
          disabled={mengirim || !santriTerpilih}
        >
          {mengirim ? "Menyimpan…" : "Simpan setoran"}
        </button>
      </div>
    </form>
  );
}
