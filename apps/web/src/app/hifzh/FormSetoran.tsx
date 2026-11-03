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
import {
  gayaFormulirLebar,
  gayaKisiDua,
  gayaKisiTiga,
  gayaLabel,
  gayaLencanaNilai,
  gayaMasukan,
  gayaMasukanTerkunci,
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

/** Format Hijriah dari tanggal Masehi (kalender Islam Umm al-Qura). */
export function formatHijriah(tanggalMasehi: string): string {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggalMasehi);
  if (!cocok) return "—";
  const tanggal = new Date(
    Number(cocok[1]),
    Number(cocok[2]) - 1,
    Number(cocok[3]),
    12, // tengah hari setempat, menghindari geser hari karena zona waktu
  );
  for (const kalender of ["islamic-umalqura", "islamic"]) {
    try {
      return new Intl.DateTimeFormat(`id-ID-u-ca-${kalender}`, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(tanggal);
    } catch {
      // coba kalender berikutnya
    }
  }
  return "—";
}

function keAngka(teks: string): number {
  const n = Number.parseInt(teks, 10);
  return Number.isFinite(n) ? n : 0;
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

  const santriTerpilih =
    daftarSantri.find((s) => s.id === santriId) ?? daftarSantri[0];

  async function tanganiKirim(e: React.FormEvent) {
    e.preventDefault();
    setRalat(null);
    setPesan(null);

    if (!santriTerpilih) {
      setRalat("Daftar santri belum termuat.");
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
    <form onSubmit={tanganiKirim} style={gayaFormulirLebar}>
      <label style={gayaLabel}>
        Santri
        <select
          value={santriTerpilih?.id ?? ""}
          onChange={(e) => setSantriId(e.target.value)}
          style={gayaMasukan}
          required
        >
          {daftarSantri.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
              {s.kelasTingkat ? ` — Kelas ${s.kelasTingkat}` : ""}
            </option>
          ))}
        </select>
      </label>

      <div style={gayaKisiDua}>
        <label style={gayaLabel}>
          1 · Tanggal (Masehi)
          <input
            type="date"
            value={tanggalMasehi}
            onChange={(e) => setTanggalMasehi(e.target.value)}
            style={gayaMasukan}
            required
          />
        </label>
        <label style={gayaLabel}>
          Tanggal Hijriah (otomatis)
          <input
            type="text"
            value={tanggalHijriah}
            readOnly
            style={gayaMasukanTerkunci}
            aria-readonly="true"
          />
        </label>
      </div>

      <label style={gayaLabel}>
        2 · Jenis Hafalan
        <select
          value={jenis}
          onChange={(e) => setJenis(e.target.value as JenisSetoran)}
          style={gayaMasukan}
        >
          {SEMUA_JENIS_SETORAN.map((j) => (
            <option key={j} value={j}>
              {LABEL_JENIS_SETORAN[j]}
            </option>
          ))}
        </select>
      </label>

      <div style={gayaKisiDua}>
        <label style={gayaLabel}>
          3 · Halaman
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
          4 · Surat
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
          Ayat Dari
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
          Ayat Sampai
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

      <fieldset style={{ border: "1px solid var(--garis)", borderRadius: 10, padding: 12, margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, padding: "0 6px" }}>
          5 · Kesalahan
        </legend>
        <div style={gayaKisiTiga}>
          <label style={gayaLabel}>
            RG
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={rg}
              onChange={(e) => setRg(e.target.value)}
              style={gayaMasukan}
            />
          </label>
          <label style={gayaLabel}>
            KK
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={kk}
              onChange={(e) => setKk(e.target.value)}
              style={gayaMasukan}
            />
          </label>
          <label style={gayaLabel}>
            KB
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={kb}
              onChange={(e) => setKb(e.target.value)}
              style={gayaMasukan}
            />
          </label>
        </div>
        <p style={{ ...gayaPetunjuk, marginTop: 8 }}>
          RG = ragu (membaik sendiri / diingatkan 1x) · KK = kesalahan kecil
          (membaik setelah diingatkan minimal 2x) · KB = kesalahan besar
          (tidak membaik setelah diingatkan 3x). Konversi bertahap:
          3 RG = 1 KK, 3 KK = 1 KB.
        </p>
        <label style={{ ...gayaLabel, marginTop: 10 }}>
          Catatan Hafalan — rincian kesalahan (nomor ayat &amp; lafazh)
          <textarea
            value={catatanRincian}
            onChange={(e) => setCatatanRincian(e.target.value)}
            style={{ ...gayaMasukan, minHeight: 64, resize: "vertical" }}
            placeholder="mis. Ayat 47: lafazh …"
          />
        </label>
      </fieldset>

      <div aria-live="polite" className="pratinjau-nilai">
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          6 · Pratinjau Nilai:
        </span>
        <span style={gayaLencanaNilai(nilaiLive)}>
          {nilaiLive} — {LABEL_NILAI_SETORAN[nilaiLive]}
        </span>
        <span style={gayaPetunjuk}>
          {jenis === "BR" || jenis === "TS"
            ? "BR/TS: L hanya bila RG, KK, KB semuanya 0."
            : `KB hasil konversi: ${rincian.kbTotal} (KK total ${rincian.kkTotal}) — L bila KB konversi ≤ 3.`}
        </span>
      </div>

      <label style={gayaLabel}>
        7 · Paraf Penyimak (terkunci)
        <input
          type="text"
          value={`${namaPenyimak} — ${labelPeranPenyimak}`}
          readOnly
          style={gayaMasukanTerkunci}
          aria-readonly="true"
        />
        <span style={gayaPetunjuk}>
          Paraf selalu nama akun yang masuk dan tidak bisa diganti nama orang
          lain.
        </span>
      </label>

      <label style={gayaLabel}>
        8 · Tugas Berikutnya
        <input
          type="text"
          value={tugasBerikutnya}
          onChange={(e) => setTugasBerikutnya(e.target.value)}
          style={gayaMasukan}
          placeholder="Hafalan yang disiapkan untuk setoran selanjutnya"
        />
      </label>

      {ralat && (
        <p role="alert" style={{ margin: 0, color: "#8e2f24", fontSize: 14 }}>
          {ralat}
        </p>
      )}
      {pesan && (
        <p role="status" style={{ margin: 0, color: "var(--hijau-gelap)", fontSize: 14 }}>
          {pesan}
        </p>
      )}
      {sumber === "contoh" && (
        <p style={gayaPetunjuk}>
          Mode data contoh: setoran yang dikirim hanya tampil di daftar
          halaman ini, tidak tersimpan ke mana pun.
        </p>
      )}

      <button type="submit" className="tombol" disabled={mengirim}>
        {mengirim ? "Menyimpan…" : "Simpan setoran"}
      </button>
    </form>
  );
}
