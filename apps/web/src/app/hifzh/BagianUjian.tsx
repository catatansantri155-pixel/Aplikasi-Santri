"use client";

/**
 * Tes Semester Hifzhul Qur'an — tabel PER JUZ (ABU_SABIQ_2.pdf).
 *
 * Satu baris per juz: Juz, Halaman, RG, KK, KB, dan Hasil yang dihitung
 * OTOMATIS oleh hasilUjian() di src/lib/hifzh.ts dari KB hasil konversi
 * bertahap: 0 = M (Mutqin), 1–2 = BS, 3–4 = B, 5–7 = C, 8–10 = K,
 * ≥ 11 = G (Goncang). Jumlah setoran sekali majelis: 2 lembar.
 */
import { useEffect, useMemo, useState } from "react";
import {
  LABEL_HASIL_UJIAN,
  hasilUjian,
  kbKonversi,
} from "@/lib/hifzh";
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

  const santriTerpilih =
    daftarSantri.find((s) => s.id === santriId) ?? daftarSantri[0];

  useEffect(() => {
    if (!santriTerpilih) return;
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
      setRalat("Daftar santri belum termuat.");
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
          ? `Baris Juz ${juzN} tersimpan ke database.`
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
          value={santriTerpilih?.id ?? ""}
          onChange={(e) => setSantriId(e.target.value)}
          style={gayaMasukan}
        >
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
        juz dihitung dari KB hasil konversi bertahap (3 RG = 1 KK,
        3 KK = 1 KB). Jumlah hafalan yang disetorkan sekali majelis adalah
        2 lembar.
        {ringkasan ? ` ${ringkasan}.` : ""}
      </p>

      {memuat ? (
        <p style={gayaPetunjuk}>Memuat tabel juz…</p>
      ) : baris.length === 0 ? (
        <p style={gayaPetunjuk}>
          Belum ada baris juz untuk santri ini. Tambahkan lewat formulir di
          bawah.
        </p>
      ) : (
        <div className="tabel-bungkus">
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
                  <td style={gayaSel}>{b.juz}</td>
                  <td style={gayaSel}>{b.halaman}</td>
                  <td style={gayaSel}>{b.rg}</td>
                  <td style={gayaSel}>{b.kk}</td>
                  <td style={gayaSel}>{b.kb}</td>
                  <td style={gayaSel}>{kbKonversi(b.rg, b.kk, b.kb)}</td>
                  <td style={gayaSel}>
                    <span style={gayaLencanaHasil(b.hasil)}>{b.hasil}</span>{" "}
                    <span style={gayaPetunjuk}>{LABEL_HASIL_UJIAN[b.hasil]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        onSubmit={tanganiKirim}
        style={{ display: "grid", gap: 12, maxWidth: 560, marginTop: 16 }}
      >
        <div style={gayaKisiTiga}>
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
          <p role="alert" style={{ margin: 0, color: "#8e2f24", fontSize: 14 }}>
            {ralat}
          </p>
        )}
        {pesan && (
          <p role="status" style={{ margin: 0, color: "var(--hijau-gelap)", fontSize: 14 }}>
            {pesan}
          </p>
        )}

        <button type="submit" className="tombol" disabled={mengirim}>
          {mengirim ? "Menyimpan…" : "Tambah Baris Juz"}
        </button>
      </form>
    </div>
  );
}
