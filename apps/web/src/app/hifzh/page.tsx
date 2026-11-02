"use client";

/**
 * Halaman Hifzh — Tahap 2 Jalur D.
 *
 * Isi: (a) form setoran 8 kolom Buku Hafalan dengan pratinjau nilai L/U
 * live dan paraf terkunci; (b) daftar setoran terakhir; (c) tes semester
 * per juz dengan hasil otomatis.
 *
 * Sumber data lewat src/lib/data/hifzh.ts: selama env Supabase belum
 * terisi (Tahap 3), halaman menampilkan DATA CONTOH fiktif dan
 * menandainya dengan jujur lewat penanda di bawah judul.
 */
import { useEffect, useState } from "react";
import PenandaTahap from "@/components/PenandaTahap";
import { LABEL_PERAN, PERAN } from "@/lib/peran";
import { LABEL_NILAI_SETORAN } from "@/lib/hifzh";
import {
  NAMA_PENYIMAK_CONTOH,
  ambilDaftarSantri,
  ambilSetoranTerakhir,
  type SantriRingkas,
  type SetoranHifzh,
  type SumberData,
} from "@/lib/data/hifzh";
import FormSetoran from "./FormSetoran";
import BagianUjian from "./BagianUjian";
import { gayaLencanaNilai, gayaPetunjuk } from "./gaya";

/**
 * Akun login CONTOH untuk paraf terkunci, selama login Supabase Auth
 * belum disambungkan (Tahap 3). Setelah login asli aktif, nama & peran
 * ini diganti dari sesi pengguna — paraf tetap terkunci pada akun masuk.
 */
const PENGGUNA_MASUK_CONTOH = {
  nama: NAMA_PENYIMAK_CONTOH,
  labelPeran: LABEL_PERAN[PERAN.PENGAJAR_HIFZH],
};

function formatMasehi(tanggalIso: string): string {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggalIso);
  if (!cocok) return tanggalIso;
  const tanggal = new Date(
    Number(cocok[1]),
    Number(cocok[2]) - 1,
    Number(cocok[3]),
    12,
  );
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(tanggal);
  } catch {
    return tanggalIso;
  }
}

export default function HalamanHifzh() {
  const [daftarSantri, setDaftarSantri] = useState<SantriRingkas[]>([]);
  const [setoran, setSetoran] = useState<SetoranHifzh[]>([]);
  const [sumber, setSumber] = useState<SumberData>("contoh");
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let batal = false;
    Promise.all([ambilDaftarSantri(), ambilSetoranTerakhir(10)])
      .then(([hasilSantri, hasilSetoran]) => {
        if (batal) return;
        setDaftarSantri(hasilSantri.data);
        setSetoran(hasilSetoran.data);
        setSumber(
          hasilSantri.sumber === "supabase" && hasilSetoran.sumber === "supabase"
            ? "supabase"
            : "contoh",
        );
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  return (
    <>
      <PenandaTahap
        teks={
          sumber === "contoh"
            ? "DATA CONTOH · TAHAP 2 — env Supabase belum terisi"
            : "TAHAP 2 — data dari Supabase"
        }
      />
      <h1 className="judul-halaman">Hifzh — Buku Hafalan</h1>
      <p className="subjudul">
        Setoran hafalan sesuai Buku Hafalan Ponpes Minhajus Sunnah: tanggal
        Hijriah, jenis BC/BR/TS/LM, halaman, surat dan ayat, kesalahan
        RG/KK/KB, nilai L/U otomatis, paraf penyimak, dan tugas berikutnya —
        serta tes semester per juz. Masuk sebagai{" "}
        {PENGGUNA_MASUK_CONTOH.nama} ({PENGGUNA_MASUK_CONTOH.labelPeran}).
      </p>

      <section className="kartu">
        <h2>Form Setoran</h2>
        <p>
          Nilai L/U dihitung langsung saat mengisi, memakai aturan resmi
          Buku Hafalan yang sama dengan database.
        </p>
        {memuat ? (
          <p style={gayaPetunjuk}>Memuat daftar santri…</p>
        ) : (
          <FormSetoran
            daftarSantri={daftarSantri}
            namaPenyimak={PENGGUNA_MASUK_CONTOH.nama}
            labelPeranPenyimak={PENGGUNA_MASUK_CONTOH.labelPeran}
            sumber={sumber}
            onTerkirim={(baru) =>
              setSetoran((lama) => [baru, ...lama].slice(0, 15))
            }
          />
        )}
      </section>

      <section className="kartu">
        <h2>Setoran Terakhir</h2>
        {memuat ? (
          <p style={gayaPetunjuk}>Memuat setoran…</p>
        ) : setoran.length === 0 ? (
          <p style={gayaPetunjuk}>Belum ada setoran tercatat.</p>
        ) : (
          <div>
            {setoran.map((s) => (
              <article
                key={s.id}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--garis)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>{s.santriNama || "—"}</strong>
                    <div style={gayaPetunjuk}>
                      {formatMasehi(s.tanggalMasehi)} · {s.tanggalHijriah}
                    </div>
                  </div>
                  <span style={gayaLencanaNilai(s.nilaiHuruf)}>
                    {s.nilaiHuruf} — {LABEL_NILAI_SETORAN[s.nilaiHuruf]}
                  </span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                  <strong>{s.jenis}</strong> · {s.surat} ayat {s.ayatDari}–
                  {s.ayatSampai} · halaman {s.halaman} · RG {s.rg} · KK {s.kk}{" "}
                  · KB {s.kb}
                </p>
                {s.catatanRincian && (
                  <p style={{ ...gayaPetunjuk, marginTop: 2 }}>
                    Rincian kesalahan: {s.catatanRincian}
                  </p>
                )}
                <p style={{ ...gayaPetunjuk, marginTop: 2 }}>
                  Penyimak: {s.penyimakNama || "—"}
                  {s.tugasBerikutnya
                    ? ` · Tugas berikutnya: ${s.tugasBerikutnya}`
                    : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="kartu">
        <h2>Tes Semester Hifzhul Qur&apos;an</h2>
        <p>
          Penilaian per juz dari lembar tes semester: hasil M (Mutqin)
          sampai G (Goncang) dihitung otomatis dari kesalahan RG/KK/KB.
        </p>
        {memuat ? (
          <p style={gayaPetunjuk}>Memuat daftar santri…</p>
        ) : (
          <BagianUjian daftarSantri={daftarSantri} sumber={sumber} />
        )}
      </section>
    </>
  );
}
