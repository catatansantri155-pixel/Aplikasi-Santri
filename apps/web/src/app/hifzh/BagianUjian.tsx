"use client";
import { PenandaMuat, Putaran } from "@/components/Muat";

/**
 * Tes Semester Hifzhul Qur'an — tabel PER JUZ (ABU_SABIQ_2.pdf).
 *
 * Satu baris per juz: Juz, Halaman, RG, KK, KB, dan Hasil yang dihitung
 * OTOMATIS oleh hasilUjian() di src/lib/hifzh.ts dari KB hasil konversi
 * bertahap: 0 = M (Mutqin), 1–2 = BS, 3–4 = B, 5–7 = C, 8–10 = K,
 * ≥ 11 = G (Goncang). Jumlah setoran sekali majelis: 2 lembar.
 */
import { useEffect, useMemo, useState } from "react";
import { LABEL_HASIL_UJIAN, hasilUjian, kbKonversi } from "@/lib/hifzh";
import {
  ambilUjianSemester,
  simpanBarisUjian,
  type BarisUjianHifzh,
  type SantriRingkas,
  type SumberData,
} from "@/lib/data/hifzh";
import {
  gayaKisiTiga,
  gayaLabel,
  gayaLencanaHasil,
  gayaMasukan,
  gayaPetunjuk,
  gayaSel,
  gayaSelKepala,
  gayaTabel,
} from "./gaya";

interface PropertiBagianUjian {
  daftarSantri: SantriRingkas[];
  sumber: SumberData;
}

function keAngka(teks: string): number {
  const n = Number.parseInt(teks, 10);
  return Number.isFinite(n) ? n : 0;
}

export default function BagianUjian({
  daftarSantri,
  sumber,
}: PropertiBagianUjian) {
  const [santriId, setSantriId] = useState("");
  const [baris, setBaris] = useState<BarisUjianHifzh[]>([]);
  const [memuat, setMemuat] = useState(false);

  const [juz, setJuz] = useState("");
  const [halaman, setHalaman] = useState("");
  const [rg, setRg] = useState("0");
  const [kk, setKk] = useState("0");
  const [kb, setKb] = useState("0");
  const [pesan, setPesan] = useState<string | null>(null);
  const [ralat, setRalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  // Santri TIDAK dipilih otomatis (audit Fase 1, pola sama dengan
  // FormSetoran): tanpa pilihan sadar, tabel juz kosong dan tombol
  // simpan nonaktif — baris ujian tidak boleh masuk ke anak yang salah.
  const santriTerpilih = daftarSantri.find((s) => s.id === santriId) ?? null;

  useEffect(() => {
    if (!santriTerpilih) {
      setBaris([]);
      return;
    }
    let batal = false;
    setMemuat(true);
    ambilUjianSemester(santriTerpilih.id)
      .then((hasil) => {
        if (!batal) setBaris(hasil.data);
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, [santriTerpilih]);

  // Pratinjau hasil LIVE untuk baris yang sedang diisi.
  const rgN = Math.max(0, keAngka(rg));
  const kkN = Math.max(0, keAngka(kk));
  const kbN = Math.max(0, keAngka(kb));
  const hasilLive = hasilUjian(rgN, kkN, kbN);
  const kbKonversiLive = kbKonversi(rgN, kkN, kbN);

  /* Baris juz yang sedang diketik nomornya, bila SUDAH ada untuk
     santri terpilih (audit Fase 3): tombol berubah menjadi
     "Perbarui Juz <n>" dan nilai lama ditampilkan, agar pengajar
     sadar ia memperbarui — bukan menambah baris baru. */
  const juzInput = keAngka(juz);
  const barisJuzIni =
    juzInput >= 1 && juzInput <= 30
      ? (baris.find((b) => b.juz === juzInput) ?? null)
      : null;

  const ringkasan = useMemo(() => {
    if (baris.length === 0) return null;
    const totalHalaman = baris.reduce((j, b) => j + b.halaman, 0);
    return `${baris.length} juz terisi · total ${totalHalaman} halaman`;
  }, [baris]);

  async function tanganiKirim(e: React.FormEvent) {
    e.preventDefault();
    setRalat(null);
    setPesan(null);
    if (!santriTerpilih) {
      setRalat("Pilih santri dulu sebelum menyimpan baris ujian.");
      return;
    }
    const juzN = keAngka(juz);
    const halamanN = keAngka(halaman);
    if (juzN < 1 || juzN > 30) {
      setRalat("Juz harus antara 1 sampai 30.");
      return;
    }
    if (halamanN < 1) {
      setRalat("Halaman harus diisi (angka mulai dari 1).");
      return;
    }
    const masukan = {
      santriId: santriTerpilih.id,
      juz: juzN,
      halaman: halamanN,
      rg: rgN,
      kk: kkN,
      kb: kbN,
    };
    const memperbarui = baris.some((b) => b.juz === juzN);
    setMengirim(true);
    try {
      const hasilSimpan = await simpanBarisUjian(masukan);
      const barisBaru: BarisUjianHifzh = {
        id: `lokal-ujian-${santriTerpilih.id}-${juzN}`,
        ...masukan,
        hasil: hasilUjian(masukan.rg, masukan.kk, masukan.kb),
      };
      setBaris((lama) => {
        // Satu baris per juz per santri (sama dengan UNIQUE di database):
        // juz yang sama menimpa baris sebelumnya.
        const tanpaJuzIni = lama.filter((b) => b.juz !== juzN);
        return [...tanpaJuzIni, barisBaru].sort((a, b) => a.juz - b.juz);
      });
      setPesan(
        hasilSimpan.tersimpanKeDatabase
          ? `Baris Juz ${juzN} ${memperbarui ? "diperbarui" : "tersimpan"} ke database.`
          : memperbarui
            ? `Baris Juz ${juzN} diperbarui pada tabel di halaman ini sebagai CONTOH (belum masuk database).`
            : `Baris Juz ${juzN} ditambahkan ke tabel di halaman ini sebagai CONTOH (belum masuk database).`,
      );
      setJuz("");
      setHalaman("");
      setRg("0");
      setKk("0");
      setKb("0");
    } catch (err) {
      setRalat(
        err instanceof Error
          ? `Gagal menyimpan: ${err.message}`
          : "Gagal menyimpan baris ujian.",
      );
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div>
      <label style={{ ...gayaLabel, maxWidth: 420, marginBottom: 12 }}>
        Santri yang Diuji
        <select
          value={santriId}
          onChange={(e) => setSantriId(e.target.value)}
          style={gayaMasukan}
        >
          <option value="">
            {daftarSantri.length === 0 ? "Belum ada santri" : "Pilih santri…"}
          </option>
          {daftarSantri.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
              {s.kelasTingkat ? ` — Kelas ${s.kelasTingkat}` : ""}
            </option>
          ))}
        </select>
      </label>

      <p style={{ ...gayaPetunjuk, marginBottom: 10 }}>
        Lembar tes semester{sumber === "contoh" ? " (contoh)" : ""}: hasil per
        juz dihitung dari KB hasil konversi bertahap (3 RG = 1 KK, 3 KK = 1 KB).
        Jumlah hafalan yang disetorkan sekali majelis adalah 2 lembar.
        {ringkasan ? ` ${ringkasan}.` : ""}
      </p>

      {!santriTerpilih ? (
        <p style={gayaPetunjuk}>
          Pilih santri terlebih dahulu untuk melihat dan mengisi baris juz tes
          semesternya.
        </p>
      ) : memuat ? (
        <PenandaMuat teks="Memuat tabel juz…" />
      ) : baris.length === 0 ? (
        <p style={gayaPetunjuk}>
          Belum ada baris juz untuk santri ini. Tambahkan lewat formulir di
          bawah.
        </p>
      ) : (
        <div className="tabel-bungkus tabel-adaptif">
          <table style={gayaTabel}>
            <thead>
              <tr>
                <th style={gayaSelKepala}>Juz</th>
                <th style={gayaSelKepala}>Halaman</th>
                <th style={gayaSelKepala}>RG</th>
                <th style={gayaSelKepala}>KK</th>
                <th style={gayaSelKepala}>KB</th>
                <th style={gayaSelKepala}>KB Konversi</th>
                <th style={gayaSelKepala}>Hasil</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.id}>
                  <td data-label="Juz" style={gayaSel}>
                    {b.juz}
                  </td>
                  <td data-label="Halaman" style={gayaSel}>
                    {b.halaman}
                  </td>
                  <td data-label="RG" style={gayaSel}>
                    {b.rg}
                  </td>
                  <td data-label="KK" style={gayaSel}>
                    {b.kk}
                  </td>
                  <td data-label="KB" style={gayaSel}>
                    {b.kb}
                  </td>
                  <td data-label="KB konversi" style={gayaSel}>
                    {kbKonversi(b.rg, b.kk, b.kb)}
                  </td>
                  <td data-label="Hasil" style={gayaSel}>
                    <span style={gayaLencanaHasil(b.hasil)}>{b.hasil}</span>{" "}
                    <span style={gayaPetunjuk}>
                      {LABEL_HASIL_UJIAN[b.hasil]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        onSubmit={tanganiKirim}
        className="form-ujian"
        style={{ display: "grid", gap: 16, marginTop: 20 }}
      >
        <div className="kisi-ujian" style={gayaKisiTiga}>
          <label style={gayaLabel}>
            Juz
            <input
              type="number"
              min={1}
              max={30}
              inputMode="numeric"
              value={juz}
              onChange={(e) => setJuz(e.target.value)}
              style={gayaMasukan}
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
              required
            />
          </label>
          <label style={gayaLabel}>
            Hasil (otomatis)
            <span
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "var(--tinggi-sentuh)",
              }}
              aria-live="polite"
            >
              <span style={gayaLencanaHasil(hasilLive)}>{hasilLive}</span>
              <span style={{ ...gayaPetunjuk, marginLeft: 8 }}>
                {LABEL_HASIL_UJIAN[hasilLive]} · KB konversi {kbKonversiLive}
              </span>
            </span>
          </label>
        </div>
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

        {ralat && (
          <p role="alert" style={{ margin: 0, color: "#c22826", fontSize: 14 }}>
            {ralat}
          </p>
        )}
        {pesan && (
          <p
            role="status"
            style={{ margin: 0, color: "var(--hijau-gelap)", fontSize: 14 }}
          >
            {pesan}
          </p>
        )}

        <p style={{ ...gayaPetunjuk, margin: 0 }}>
          {santriTerpilih ? (
            <>
              Santri terpilih:{" "}
              <strong>
                {santriTerpilih.nama}
                {santriTerpilih.kelasTingkat
                  ? ` — Kelas ${santriTerpilih.kelasTingkat}`
                  : ""}
              </strong>
            </>
          ) : (
            "Pilih santri terlebih dahulu — baris ujian tidak akan tersimpan sebelum santri dipilih."
          )}
        </p>

        {barisJuzIni && (
          <p style={{ ...gayaPetunjuk, margin: 0 }} aria-live="polite">
            Baris Juz {barisJuzIni.juz} sudah ada untuk santri ini: halaman{" "}
            {barisJuzIni.halaman} · RG {barisJuzIni.rg} · KK {barisJuzIni.kk} ·
            KB {barisJuzIni.kb} · hasil {barisJuzIni.hasil} (
            {LABEL_HASIL_UJIAN[barisJuzIni.hasil]}). Menyimpan akan memperbarui
            baris tersebut.
          </p>
        )}

        <button
          type="submit"
          className="tombol"
          disabled={mengirim || !santriTerpilih}
        >
          {mengirim && <Putaran />} {mengirim
            ? "Menyimpan…"
            : barisJuzIni
              ? `Perbarui Juz ${barisJuzIni.juz}`
              : "Tambah Baris Juz"}
        </button>
      </form>
    </div>
  );
}
