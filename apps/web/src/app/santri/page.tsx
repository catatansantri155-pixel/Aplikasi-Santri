"use client";

/**
 * Halaman Daftar Santri — Jalur C, Tahap 2.
 * Dikelompokkan per Kelas 1/2/3, dengan pencarian nama santri / nama
 * ayah-wali. Data dibaca lewat lapisan data (src/lib/data/santri.ts);
 * selama env Supabase belum terisi, yang tampil adalah DATA CONTOH FIKSI
 * dan halaman ini menandainya dengan jelas.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import {
  ambilSantriPerKelas,
  cariSantri,
  type Santri,
} from "@/lib/data/santri";

interface Kelompok {
  kelas: { id: string; tingkat: number; nama: string };
  santri: Santri[];
}

export default function HalamanSantri() {
  const [kelompok, setKelompok] = useState<Kelompok[]>([]);
  const [sumberContoh, setSumberContoh] = useState(false);
  const [pencarian, setPencarian] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;
    ambilSantriPerKelas()
      .then((hasil) => {
        if (!aktif) return;
        setKelompok(hasil.data);
        setSumberContoh(hasil.sumberContoh);
        setMemuat(false);
      })
      .catch((e: unknown) => {
        if (!aktif) return;
        setGalat(e instanceof Error ? e.message : "Gagal memuat data santri.");
        setMemuat(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  /** Hasil pencarian diterapkan ke tiap kelompok kelas. */
  const kelompokTampil = useMemo(
    () =>
      kelompok
        .map((k) => ({ ...k, santri: cariSantri(k.santri, pencarian) }))
        .filter((k) => k.santri.length > 0),
    [kelompok, pencarian],
  );

  const totalTampil = kelompokTampil.reduce((n, k) => n + k.santri.length, 0);

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">Data Santri</h1>
      <p className="subjudul">
        Santri dikelompokkan per kelas 1, 2, dan 3. Ketuk nama santri untuk
        membuka kehadiran, hifzh, diniyyah, dan catatannya.
      </p>

      <div className="formulir" style={{ maxWidth: "100%", marginBottom: 16 }}>
        <label>
          Cari santri
          <input
            type="search"
            value={pencarian}
            onChange={(e) => setPencarian(e.target.value)}
            placeholder="Nama santri atau nama ayah/wali…"
            aria-label="Cari nama santri atau nama ayah wali"
          />
        </label>
      </div>

      {memuat && <p className="catatan-kaki">Memuat daftar santri…</p>}
      {galat && (
        <section className="kartu">
          <h2>Data belum bisa dimuat</h2>
          <p>{galat}</p>
        </section>
      )}
      {!memuat && !galat && totalTampil === 0 && (
        <section className="kartu">
          <h2>Tidak ditemukan</h2>
          <p>
            Tidak ada santri yang cocok dengan pencarian &ldquo;{pencarian}
            &rdquo;. Coba kata lain.
          </p>
        </section>
      )}

      {kelompokTampil.map((k) => (
        <section key={k.kelas.id} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>
            {k.kelas.nama}{" "}
            <span style={{ color: "var(--teks-redup)", fontWeight: 400 }}>
              · {k.santri.length} santri
            </span>
          </h2>
          <div style={{ display: "grid", gap: 10 }}>
            {k.santri.map((s) => (
              <Link
                key={s.id}
                href={`/santri/${s.id}`}
                className="kartu"
                style={{
                  display: "block",
                  marginBottom: 0,
                  textDecoration: "none",
                  color: "var(--teks)",
                }}
              >
                <span style={{ display: "block", fontWeight: 700 }}>
                  {s.nama}
                </span>
                <span style={{ display: "block", color: "var(--teks-redup)", fontSize: 14 }}>
                  Ayah/Wali: {s.namaAyahWali}
                  {s.nis ? ` · NIS ${s.nis}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
