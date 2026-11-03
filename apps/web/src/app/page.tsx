"use client";

/**
 * Beranda — dua mode:
 *
 * MODE CONTOH (env Supabase kosong): tampilan scaffold peran (Jalur B)
 * + "Tampilan Wali (contoh)" (Jalur F): pandangan SATU wali atas SATU
 * anaknya, hanya-lihat, dari data contoh. Pembatas aslinya adalah RLS
 * database (wali hanya lolos membaca santri yang tertaut kepadanya di
 * tabel wali_santri) — bukan sekadar tampilan yang disembunyikan.
 *
 * MODE SUPABASE (login asli tersambung): sapaan sesuai profil pengguna
 * yang login (nama + peran dari tabel profiles) dan tautan modul yang
 * disaring per peran dari peta terpusat src/lib/akses.ts (kartu modul
 * yang tidak berhak dibuka peran itu tidak ditampilkan), tanpa
 * penanda contoh dan tanpa mengarang data apa pun.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import PenandaTahap from "@/components/PenandaTahap";
import { bolehAksesModul } from "@/lib/akses";
import { LABEL_PERAN, RINGKASAN_PERAN, SEMUA_PERAN } from "@/lib/peran";
import {
  ambilDaftarSantri,
  supabaseTerhubung,
  type Santri,
} from "@/lib/data/santri";
import { ambilProfilLogin, type ProfilLogin } from "@/lib/sesi";
import {
  ambilRiwayatKehadiranSantri,
  LABEL_STATUS,
  STATUS_KEHADIRAN,
  type StatusKehadiran,
} from "@/lib/data/kehadiran";
import {
  ambilSetoranTerakhir,
  type SetoranHifzh,
} from "@/lib/data/hifzh";
import { LABEL_NILAI_SETORAN } from "@/lib/hifzh";

/**
 * Catatan terakhir untuk kartu wali (CONTOH LOKAL SEMENTARA).
 * Selaras dengan catatan contoh lokal di tab Catatan halaman detail
 * santri untuk santri yang sama. Akan diganti lib/data/catatan begitu
 * lapisan data catatan tersedia.
 */
const CATATAN_TERAKHIR_WALI_CONTOH = {
  tanggal: "2026-11-01",
  kategoriLabel: "Akhlaq",
  isi: "Membantu teman sekelasnya menyiapkan tempat wudu sebelum shalat Zhuhur berjamaah.",
  pelaporNama: "Ust. Musyrif Contoh",
};

function formatTanggal(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface RingkasanKehadiranWali {
  hitung: Record<StatusKehadiran, number>;
  total: number;
  persenHadir: number;
}

/**
 * Tautan modul untuk beranda mode Supabase. Kunci `modul` merujuk ke
 * peta terpusat src/lib/akses.ts: kartu hanya ditampilkan bila peran
 * pengguna yang login berhak membuka modul itu.
 */
const TAUTAN_MODUL = [
  {
    href: "/santri",
    label: "Santri",
    keterangan: "Daftar santri per kelas.",
    modul: "santri",
  },
  {
    href: "/kehadiran",
    label: "Kehadiran",
    keterangan: "Isi kehadiran sesi hifzh & diniyyah, revisi khusus admin.",
    modul: "kehadiran",
  },
  {
    href: "/hifzh",
    label: "Hifzh",
    keterangan: "Setoran Buku Hafalan dan tes semester per juz.",
    modul: "hifzh",
  },
  {
    href: "/diniyyah",
    label: "Diniyyah",
    keterangan: "Nilai harian dan nilai ujian semester.",
    modul: "diniyyah",
  },
  {
    href: "/catatan",
    label: "Catatan",
    keterangan: "Catatan keseharian santri oleh pengajar & musyrif.",
    modul: "catatan",
  },
  {
    href: "/rekap",
    label: "Rekap",
    keterangan: "Rekap kehadiran pekanan & semesteran serta grafik hifzh.",
    modul: "rekap",
  },
] as const;

export default function HalamanBeranda() {
  const modeContoh = !supabaseTerhubung();
  const [anakWali, setAnakWali] = useState<Santri | null>(null);
  const [ringkasanWali, setRingkasanWali] =
    useState<RingkasanKehadiranWali | null>(null);
  const [setoranTerakhirWali, setSetoranTerakhirWali] =
    useState<SetoranHifzh | null>(null);
  const [memuatWali, setMemuatWali] = useState(true);
  const [profilLogin, setProfilLogin] = useState<ProfilLogin | null>(null);
  const [memuatProfil, setMemuatProfil] = useState(!modeContoh);

  // MODE SUPABASE: muat profil pengguna yang login untuk sapaan beranda.
  useEffect(() => {
    if (modeContoh) return;
    let aktif = true;
    (async () => {
      const profil = await ambilProfilLogin();
      if (!aktif) return;
      setProfilLogin(profil);
      setMemuatProfil(false);
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh]);

  useEffect(() => {
    // Tampilan wali contoh hanya berjalan pada mode contoh.
    if (!modeContoh) {
      setMemuatWali(false);
      return;
    }
    let aktif = true;
    (async () => {
      try {
        const daftar = await ambilDaftarSantri();
        // Wali contoh dipasangkan ke santri contoh pertama. Pada data
        // asli, pasangan ini datang dari tabel wali_santri untuk akun
        // wali yang sedang masuk — tidak dipilih dari daftar umum.
        const anak = daftar.data[0] ?? null;
        if (!aktif || !anak) {
          if (aktif) setMemuatWali(false);
          return;
        }
        setAnakWali(anak);
        const [riwayat, setoran] = await Promise.all([
          ambilRiwayatKehadiranSantri(anak.id),
          ambilSetoranTerakhir(50),
        ]);
        if (!aktif) return;
        const hitung: Record<StatusKehadiran, number> = {
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
        };
        for (const b of riwayat.data) hitung[b.status] += 1;
        const total = riwayat.data.length;
        setRingkasanWali({
          hitung,
          total,
          persenHadir:
            total > 0 ? Math.round((hitung.hadir / total) * 1000) / 10 : 0,
        });
        setSetoranTerakhirWali(
          setoran.data.find((s) => s.santriId === anak.id) ?? null,
        );
        setMemuatWali(false);
      } catch {
        if (aktif) setMemuatWali(false);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [modeContoh]);

  // ===== Beranda MODE SUPABASE: sapaan sesuai profil login =====
  if (!modeContoh) {
    return (
      <>
        <h1 className="judul-halaman">
          Selamat datang{profilLogin ? `, ${profilLogin.nama}` : ""}
        </h1>
        <p className="subjudul">
          {memuatProfil ? (
            "Memuat profil pengguna…"
          ) : profilLogin ? (
            <>
              Anda masuk sebagai{" "}
              <strong>{LABEL_PERAN[profilLogin.peran]}</strong>. Pilih modul
              di bawah untuk mulai bekerja.
            </>
          ) : (
            "Profil pengguna belum ditemukan di tabel profiles. Hubungi admin agar akun Anda didaftarkan profil dan perannya."
          )}
        </p>

        {profilLogin && (
          <section className="kartu kartu-peran">
            <p className="label-peran">{LABEL_PERAN[profilLogin.peran]}</p>
            <p>{RINGKASAN_PERAN[profilLogin.peran]}</p>
          </section>
        )}

        {/* Kartu modul hanya dirender SETELAH profil termuat, disaring
            per peran dari peta terpusat src/lib/akses.ts — kartu modul
            terlarang tidak pernah tampil, juga tidak saat memuat. */}
        {profilLogin && (
          <div className="kisi-peran">
            {TAUTAN_MODUL.filter((modul) =>
              bolehAksesModul(profilLogin.peran, modul.modul),
            ).map((modul) => (
              <section key={modul.href} className="kartu kartu-peran">
                <p className="label-peran">{modul.label}</p>
                <p>{modul.keterangan}</p>
                <Link href={modul.href}>Buka modul →</Link>
              </section>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PenandaTahap />
      <h1 className="judul-halaman">Selamat datang</h1>
      <p className="subjudul">
        Aplikasi monitoring santri Ponpes Minhajus Sunnah Magelang, Marhalah
        Wustha. Setelah masuk, tampilan akan menyesuaikan peran pengguna.
        Ringkasan tiap peran di bawah ini masih placeholder tahap scaffold.
      </p>

      <div className="kisi-peran">
        {SEMUA_PERAN.map((peran) => (
          <section key={peran} className="kartu kartu-peran">
            <p className="label-peran">{LABEL_PERAN[peran]}</p>
            <p>{RINGKASAN_PERAN[peran]}</p>
          </section>
        ))}
      </div>

      {/* ===== Tampilan Wali (contoh) — tambahan Jalur F ===== */}
      <section className="kartu" style={{ marginTop: 12 }}>
        <PenandaTahap teks="TAMPILAN WALI (CONTOH) · HANYA-LIHAT" />
        <h2>Beranda wali: hanya anaknya sendiri</h2>
        {memuatWali && <p>Memuat contoh tampilan wali…</p>}
        {!memuatWali && !anakWali && (
          <p>Data contoh santri belum tersedia.</p>
        )}
        {!memuatWali && anakWali && (
          <>
            <p>
              Contoh akun wali <strong>{anakWali.namaAyahWali}</strong>{" "}
              hanya melihat satu anaknya:{" "}
              <strong>{anakWali.nama}</strong> ({anakWali.kelasNama}).
              Santri lain tidak tampil sama sekali, dan di sini tidak ada
              tombol ubah — wali hanya membaca.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Kehadiran anak
                </div>
                {ringkasanWali ? (
                  <>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                    >
                      {STATUS_KEHADIRAN.map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 600,
                            background: "var(--hijau-muda)",
                            color: "var(--hijau-gelap)",
                          }}
                        >
                          {LABEL_STATUS[s]}: {ringkasanWali.hitung[s]}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        color: "var(--teks-redup)",
                        fontSize: 13,
                        marginTop: 6,
                      }}
                    >
                      Dari {ringkasanWali.total} sesi tercatat · Hadir{" "}
                      {ringkasanWali.persenHadir.toLocaleString("id-ID", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </div>
                  </>
                ) : (
                  <p>Memuat ringkasan kehadiran…</p>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Hifzh terakhir
                </div>
                {setoranTerakhirWali ? (
                  <p style={{ margin: 0 }}>
                    {setoranTerakhirWali.jenis} · {setoranTerakhirWali.surat}{" "}
                    ayat {setoranTerakhirWali.ayatDari}–
                    {setoranTerakhirWali.ayatSampai} ·{" "}
                    {formatTanggal(setoranTerakhirWali.tanggalMasehi)} ·
                    Nilai {setoranTerakhirWali.nilaiHuruf} (
                    {LABEL_NILAI_SETORAN[setoranTerakhirWali.nilaiHuruf]})
                  </p>
                ) : (
                  <p style={{ margin: 0 }}>
                    Belum ada setoran yang tampil untuk anak ini pada data
                    contoh tahap ini (modul hifzh memakai daftar santri
                    contoh tersendiri; pada data asli setoran anak langsung
                    tampil di sini).
                  </p>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Catatan terakhir
                </div>
                <p style={{ margin: 0 }}>
                  {CATATAN_TERAKHIR_WALI_CONTOH.kategoriLabel} ·{" "}
                  {formatTanggal(CATATAN_TERAKHIR_WALI_CONTOH.tanggal)} —{" "}
                  {CATATAN_TERAKHIR_WALI_CONTOH.isi}
                </p>
                <div style={{ color: "var(--teks-redup)", fontSize: 13 }}>
                  Pelapor: {CATATAN_TERAKHIR_WALI_CONTOH.pelaporNama}
                </div>
              </div>
            </div>
            <p style={{ marginTop: 12 }}>
              <Link href={`/santri/${anakWali.id}`}>
                Lihat detail anak →
              </Link>
            </p>
          </>
        )}
        <p className="catatan-kaki">
          Pembatasnya bukan tampilan ini: di database, aturan RLS hanya
          meloloskan baris santri yang tertaut ke akun wali di tabel
          wali_santri. Wali lain tidak bisa membuka data anak ini walau
          mengetahui alamat halamannya — penolakan itu akan dibuktikan
          pada uji negatif Tahap 4.
        </p>
      </section>
    </>
  );
}
