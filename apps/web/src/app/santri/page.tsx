"use client";

/**
 * Halaman Daftar Santri — Jalur C, Tahap 2.
 * Dikelompokkan per Kelas 1/2/3, dengan pencarian nama santri / nama
 * ayah-wali. Data dibaca lewat lapisan data (src/lib/data/santri.ts);
 * selama env Supabase belum terisi, yang tampil adalah DATA CONTOH FIKSI
 * dan halaman ini menandainya dengan jelas.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import KartuGalat from "@/components/KartuGalat";
import AvatarInisial from "@/components/AvatarInisial";
import { Ikon } from "@/components/Ikon";
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

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const hasil = await ambilSantriPerKelas();
      setKelompok(hasil.data);
      setSumberContoh(hasil.sumberContoh);
    } catch (e: unknown) {
      setGalat(e instanceof Error ? e.message : "Gagal memuat data santri.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

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
        Daftar santri per kelas 1, 2, dan 3; ketuk nama santri untuk
        membuka detailnya.
      </p>

      <div className="pencarian" style={{ marginBottom: 16 }}>
        <span className="pencarian-ikon">
          <Ikon nama="cari" ukuran={19} />
        </span>
        <input
          type="search"
          value={pencarian}
          onChange={(e) => setPencarian(e.target.value)}
          placeholder="Cari nama santri atau nama ayah/wali…"
          aria-label="Cari nama santri atau nama ayah wali"
        />
      </div>

      {memuat && <p className="catatan-kaki">Memuat daftar santri…</p>}
      {galat && <KartuGalat pesan={galat} onCobaLagi={() => void muat()} />}
      {!memuat && !galat && totalTampil === 0 && pencarian.trim() !== "" && (
        <section className="kartu">
          <h2>Tidak ditemukan</h2>
          <p>
            Tidak ada santri yang cocok dengan pencarian &ldquo;{pencarian}
            &rdquo;. Coba kata lain.
          </p>
        </section>
      )}
      {!memuat && !galat && totalTampil === 0 && pencarian.trim() === "" && (
        <section className="kartu">
          <h2>Belum ada data santri</h2>
          <p>Belum ada santri yang terdaftar pada kelas mana pun.</p>
        </section>
      )}

      {kelompokTampil.map((k) => (
        <section key={k.kelas.id}>
          <div className="kepala-seksi">
            <h2 className="judul-seksi">{k.kelas.nama}</h2>
            <span className="catatan-kaki">{k.santri.length} santri</span>
          </div>
          <div className="daftar-tumpuk">
            {k.santri.map((s) => (
              <Link
                key={s.id}
                href={`/santri/${s.id}`}
                className="baris-daftar"
              >
                <AvatarInisial nama={s.nama} ukuran="kecil" />
                <span className="baris-teks">
                  <span className="baris-judul">{s.nama}</span>
                  <span className="baris-ket">
                    Ayah/Wali: {s.namaAyahWali}
                    {s.nis ? ` · NIS ${s.nis}` : ""}
                  </span>
                </span>
                <span className="baris-kanan">
                  <Ikon nama="chevron-kanan" ukuran={18} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
