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
import AvatarInisial from "@/components/AvatarInisial";
import {
  Ikon,
  LingkaranIkon,
  type NamaIkon,
  type WarnaTint,
} from "@/components/Ikon";
import { bolehAksesModul } from "@/lib/akses";
import { DAFTAR_MODUL } from "@/lib/modul";
import IkonModul from "@/components/IkonModul";
import { LABEL_PERAN, SEMUA_PERAN } from "@/lib/peran";
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

/** Tanggal hari ini versi Masehi lengkap, untuk banner beranda. */
function formatTanggalHariIni(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Tanggal Hijriah hari ini (kalender Islam bawaan Intl); kosong bila gagal. */
function formatTanggalHijriahHariIni(): string {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return "";
  }
}

interface RingkasanKehadiranWali {
  hitung: Record<StatusKehadiran, number>;
  total: number;
  persenHadir: number;
}

/** Ikon & warna tint kartu peran pada beranda mode contoh. */
const IKON_PERAN: Record<string, { ikon: NamaIkon; warna: WarnaTint }> = {
  admin: { ikon: "perisai", warna: "emas" },
  pengajar_hifzh: { ikon: "hifzh", warna: "hijau" },
  pengajar_diniyyah: { ikon: "diniyyah", warna: "biru" },
  musyrif: { ikon: "pena", warna: "kuning" },
  wali: { ikon: "hati", warna: "merah" },
};

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
    const hijriah = formatTanggalHijriahHariIni();
    return (
      <>
        {/* Pita sapaan (arah UI UNPIX): pita gradien biru selebar
            tepi konten; isi utama berada di lembar putih melengkung
            yang menimpanya. */}
        <div className="pita">
          <section className="banner banner--pita">
            <div className="banner-baris">
              {profilLogin && (
                <AvatarInisial
                  nama={profilLogin.nama}
                  ukuran="besar"
                  diBanner
                />
              )}
              <div>
                <p className="banner-sapaan">Assalamu&rsquo;alaikum,</p>
                <p className="banner-nama">
                  {memuatProfil
                    ? "Memuat profil…"
                    : (profilLogin?.nama ?? "Pengguna")}
                </p>
                <p className="banner-sub">
                  {profilLogin
                    ? `${LABEL_PERAN[profilLogin.peran]} · `
                    : ""}
                  {formatTanggalHariIni()}
                  {hijriah ? ` · ${hijriah} H` : ""}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="lembar">
          {!memuatProfil && !profilLogin && (
            <p className="pesan-galat" role="alert">
              Profil pengguna belum ditemukan di tabel profiles. Hubungi
              admin agar akun Anda didaftarkan profil dan perannya.
            </p>
          )}

          {/* Beranda mode Supabase kini ringkas (revisi biru): pita
              sapaan + lembar berisi kisi Fast Menu saja — paragraf
              ringkasan peran dan kartu ringkasan (santri terdaftar,
              sesi olahraga, semester berjalan) DIHAPUS atas arahan
              user; ringkasan angka tersedia di halaman Grafik. */}

          {/* Kisi Fast Menu: modul hanya dirender SETELAH profil
              termuat, disaring per peran dari peta terpusat
              src/lib/akses.ts — modul terlarang tidak pernah tampil,
              juga tidak saat memuat. */}
          {profilLogin && (
            <>
              <div className="kepala-seksi" style={{ marginTop: 4 }}>
                <h2 className="judul-seksi">Modul</h2>
              </div>
              <div className="kisi-menu">
                {DAFTAR_MODUL.filter((modul) =>
                  bolehAksesModul(profilLogin.peran, modul.modul),
                ).map((modul) => (
                  <Link
                    key={modul.href}
                    href={modul.href}
                    className="item-menu"
                  >
                    <IkonModul
                      modul={modul.modul}
                      ikon={modul.ikon}
                      warna={modul.warna}
                    />
                    <span className="item-menu-label">{modul.label}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <PenandaTahap />
      <section className="banner">
        <p className="banner-sapaan">Assalamu&rsquo;alaikum,</p>
        <p className="banner-nama">Selamat datang di Aplikasi Santri</p>
        <p className="banner-sub">
          {formatTanggalHariIni()}
          {formatTanggalHijriahHariIni()
            ? ` · ${formatTanggalHijriahHariIni()} H`
            : ""}
        </p>
      </section>
      <p className="subjudul">
        Aplikasi monitoring santri Marhalah Wustha; tampilan menyesuaikan
        peran pengguna yang masuk.
      </p>

      {/* Kartu peran mode contoh: ikon + label saja (revisi biru —
          paragraf ringkasan peran tidak lagi ditampilkan di beranda
          pada mode apa pun; penjelasan hak akses lengkap ada di
          halaman Akun pada mode Supabase). */}
      <div className="kisi-peran">
        {SEMUA_PERAN.map((peran) => (
          <section key={peran} className="kartu kartu-peran">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <LingkaranIkon
                nama={IKON_PERAN[peran].ikon}
                warna={IKON_PERAN[peran].warna}
              />
              <p className="label-peran" style={{ margin: 0 }}>
                {LABEL_PERAN[peran]}
              </p>
            </div>
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
                          className={`lencana lencana--besar lencana--${s}`}
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
                    <div
                      className="bilah"
                      style={{ marginTop: 8, maxWidth: 320 }}
                      role="img"
                      aria-label={`Persentase hadir ${ringkasanWali.persenHadir}%`}
                    >
                      <div
                        className="bilah-isi"
                        style={{ width: `${ringkasanWali.persenHadir}%` }}
                      />
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
                  <p
                    style={{
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      {setoranTerakhirWali.jenis} · {setoranTerakhirWali.surat}{" "}
                      ayat {setoranTerakhirWali.ayatDari}–
                      {setoranTerakhirWali.ayatSampai} ·{" "}
                      {formatTanggal(setoranTerakhirWali.tanggalMasehi)}
                    </span>
                    <span
                      className={`lencana lencana--besar ${
                        setoranTerakhirWali.nilaiHuruf === "L"
                          ? "lencana--l"
                          : "lencana--u"
                      }`}
                    >
                      {setoranTerakhirWali.nilaiHuruf} ·{" "}
                      {LABEL_NILAI_SETORAN[setoranTerakhirWali.nilaiHuruf]}
                    </span>
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
              <Link
                href={`/santri/${anakWali.id}`}
                className="tombol tombol-kecil"
              >
                Lihat detail anak
                <Ikon nama="chevron-kanan" ukuran={15} />
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
