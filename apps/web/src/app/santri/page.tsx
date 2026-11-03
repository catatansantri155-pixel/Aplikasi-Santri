"use client";

/**
 * Halaman Daftar Santri — Jalur C, Tahap 2.
 * Dikelompokkan per Kelas 1/2/3, dengan pencarian nama santri / nama
 * ayah-wali dan chip filter kelas (audit Fase 3). Data dibaca lewat
 * lapisan data (src/lib/data/santri.ts); selama env Supabase belum
 * terisi, yang tampil adalah DATA CONTOH FIKSI dan halaman ini
 * menandainya dengan jelas.
 *
 * Untuk peran WALI judul halaman menjadi "Anak Saya" (daftarnya
 * memang hanya anaknya sendiri karena RLS), dan keadaan kosongnya
 * menjelaskan bahwa akun belum ditautkan ke santri mana pun.
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
  supabaseTerhubung,
  type Santri,
} from "@/lib/data/santri";
import { ambilProfilLogin } from "@/lib/sesi";
import { PERAN, type Peran } from "@/lib/peran";

interface Kelompok {
  kelas: { id: string; tingkat: number; nama: string };
  santri: Santri[];
}

export default function HalamanSantri() {
  const [kelompok, setKelompok] = useState<Kelompok[]>([]);
  const [sumberContoh, setSumberContoh] = useState(false);
  const [pencarian, setPencarian] = useState("");
  const [filterKelas, setFilterKelas] = useState<"semua" | number>("semua");
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  // Peran pengguna (mode Supabase) — menentukan judul "Anak Saya"
  // untuk wali. Mode contoh: tetap null, judul standar.
  const [peran, setPeran] = useState<Peran | null>(null);

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

  useEffect(() => {
    if (!supabaseTerhubung()) return;
    let batal = false;
    ambilProfilLogin().then((p) => {
      if (!batal) setPeran(p?.peran ?? null);
    });
    return () => {
      batal = true;
    };
  }, []);

  /** Filter kelas + pencarian diterapkan ke tiap kelompok kelas. */
  const kelompokTampil = useMemo(
    () =>
      kelompok
        .filter(
          (k) => filterKelas === "semua" || k.kelas.tingkat === filterKelas,
        )
        .map((k) => ({ ...k, santri: cariSantri(k.santri, pencarian) }))
        .filter((k) => k.santri.length > 0),
    [kelompok, pencarian, filterKelas],
  );

  const totalTampil = kelompokTampil.reduce((n, k) => n + k.santri.length, 0);
  const apakahWali = peran === PERAN.WALI;
  const adaPenyaring = pencarian.trim() !== "" || filterKelas !== "semua";

  return (
    <>
      {sumberContoh && (
        <PenandaTahap teks="DATA CONTOH · FIKSI — env Supabase belum terisi" />
      )}
      <h1 className="judul-halaman">
        {apakahWali ? "Anak Saya" : "Data Santri"}
      </h1>
      <p className="subjudul">
        {apakahWali
          ? "Daftar anak Anda yang tertaut ke akun ini; ketuk nama anak untuk membuka detailnya."
          : "Daftar santri per kelas 1, 2, dan 3; ketuk nama santri untuk membuka detailnya."}
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

      <div
        className="grup-chip"
        role="group"
        aria-label="Filter kelas"
        style={{ marginBottom: 12 }}
      >
        <button
          type="button"
          className="chip"
          aria-pressed={filterKelas === "semua"}
          onClick={() => setFilterKelas("semua")}
        >
          Semua
        </button>
        {[1, 2, 3].map((tingkat) => (
          <button
            key={tingkat}
            type="button"
            className="chip"
            aria-pressed={filterKelas === tingkat}
            onClick={() => setFilterKelas(tingkat)}
          >
            Kelas {tingkat}
          </button>
        ))}
      </div>

      {!memuat && !galat && (
        <p className="catatan-kaki" style={{ marginTop: 0 }}>
          Menampilkan {totalTampil} santri.
        </p>
      )}

      {memuat && <p className="catatan-kaki">Memuat daftar santri…</p>}
      {galat && <KartuGalat pesan={galat} onCobaLagi={() => void muat()} />}
      {!memuat && !galat && totalTampil === 0 && adaPenyaring && (
        <section className="kartu">
          <h2>Tidak ditemukan</h2>
          <p>
            Tidak ada santri yang cocok dengan pencarian atau filter kelas
            saat ini.
          </p>
          <p style={{ marginTop: 12 }}>
            <button
              type="button"
              className="tombol tombol-sekunder"
              onClick={() => {
                setPencarian("");
                setFilterKelas("semua");
              }}
            >
              Hapus pencarian
            </button>
          </p>
        </section>
      )}
      {!memuat && !galat && totalTampil === 0 && !adaPenyaring && apakahWali && (
        <section className="kartu">
          <h2>Belum ada anak tertaut</h2>
          <p>
            Akun Anda belum ditautkan ke santri mana pun, jadi belum ada
            data anak yang dapat ditampilkan. Hubungi admin pondok untuk
            menautkan akun Anda ke anak Anda.
          </p>
        </section>
      )}
      {!memuat &&
        !galat &&
        totalTampil === 0 &&
        !adaPenyaring &&
        !apakahWali && (
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
